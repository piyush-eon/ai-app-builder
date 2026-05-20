import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import type { Message, FileData } from "@/components/WorkspaceClient";

// ─── Gemini client ────────────────────────────────────────────────────────────

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}
3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.
4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.
5. The entry point must always be /App.js and must export a default component.
6. All imports must reference files you include in "files" or packages in "dependencies".
7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.
8. When modifying existing code, include ALL files (both changed and unchanged) in "files".
9. Keep code clean, readable, and production-quality.
10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the Gemini contents array from the conversation history.
 * Gemini uses "user" / "model" roles (not "assistant").
 */
function buildContents(
  messages: Message[],
  fileData: FileData | null
): Array<{
  role: "user" | "model";
  parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  >;
}> {
  const contents: Array<{
    role: "user" | "model";
    parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >;
  }> = [];

  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "user") {
      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      // Attach image if present (Supabase public URL → fetch as base64)
      // We pass the URL as text context since we can't fetch at build time;
      // the model will use the URL description as context.
      let textContent = msg.content;
      if (msg.imageUrl) {
        textContent = `[User attached an image: ${msg.imageUrl}]\n\n${msg.content}`;
      }

      // If this is the last user message and we have existing fileData, inject it
      const isLast = msg === messages[messages.length - 1];
      if (isLast && fileData) {
        textContent +=
          "\n\nHere is the current state of the project files for context:\n" +
          JSON.stringify(fileData, null, 2);
      }

      parts.push({ text: textContent });
      contents.push({ role, parts });
    } else {
      // assistant message
      contents.push({
        role: "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  return contents;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body
    const body = await request.json();
    const {
      workspaceId,
      userId,
      messages,
      fileData,
    }: {
      workspaceId: string | null;
      userId: string;
      messages: Message[];
      fileData: FileData | null;
    } = body;

    if (!messages || messages.length === 0) {
      return Response.json(
        { message: "No messages provided" },
        { status: 400 }
      );
    }

    // 3. Verify user & credits
    const user = await db.user.findUnique({
      where: { id: userId, clerkId },
      select: { id: true, credits: true },
    });

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    if (user.credits < CREDIT_COST_PER_GENERATION) {
      return Response.json(
        { message: "Insufficient credits" },
        { status: 402 }
      );
    }

    // 4. Call Gemini
    const contents = buildContents(messages, fileData);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text ?? "";

    // 5. Parse AI response
    let parsed: {
      assistantMessage: string;
      files: Record<string, { code: string }>;
      dependencies: Record<string, string>;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return Response.json(
        { message: "AI returned an invalid response. Please try again." },
        { status: 500 }
      );
    }

    const { assistantMessage, files, dependencies } = parsed;

    if (!files || typeof files !== "object") {
      return Response.json(
        { message: "AI response missing files. Please try again." },
        { status: 500 }
      );
    }

    const newFileData: FileData = {
      files,
      dependencies: dependencies ?? {},
    };

    // 6. Build updated messages array for DB
    const lastUserMessage = messages[messages.length - 1];
    const updatedMessages: Message[] = [
      ...messages,
      { role: "assistant", content: assistantMessage },
    ];

    // 7. Upsert workspace & deduct credit in a transaction
    const [workspace] = await db.$transaction([
      workspaceId
        ? db.workspace.update({
            where: { id: workspaceId, userId },
            data: {
              messages: updatedMessages as never,
              fileData: newFileData as never,
              // Auto-title from first user message if not set
              title: undefined,
            },
          })
        : db.workspace.create({
            data: {
              userId,
              title: lastUserMessage.content.slice(0, 80),
              messages: updatedMessages as never,
              fileData: newFileData as never,
            },
          }),
      db.user.update({
        where: { id: userId },
        data: { credits: { decrement: CREDIT_COST_PER_GENERATION } },
      }),
    ]);

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    // 8. Return
    return Response.json({
      workspaceId: workspace.id,
      assistantMessage,
      fileData: newFileData,
      creditsRemaining:
        updatedUser?.credits ?? user.credits - CREDIT_COST_PER_GENERATION,
    });
  } catch (error) {
    console.error("[gen-ai-code] error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
