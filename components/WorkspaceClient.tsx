"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "./ChatPanel";
import { CodePanel } from "./CodePanel";
import {
  CREDIT_COST_PER_GENERATION,
  MIN_CREDITS_TO_GENERATE,
} from "@/lib/constants";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
  imageUrl?: string; // Supabase CDN URL for uploaded images
}

export interface FileData {
  files: Record<string, { code: string }>;
  dependencies: Record<string, string>;
}

interface WorkspaceData {
  id: string;
  title: string | null;
  messages: unknown;
  fileData: unknown;
}

interface WorkspaceClientProps {
  initialPrompt: string | null;
  workspace: WorkspaceData | null;
  userCredits: number;
  userId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMessages(raw: unknown): Message[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is Message =>
      typeof m === "object" && m !== null && "role" in m && "content" in m
  );
}

function parseFileData(raw: unknown): FileData | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (!f.files || !f.dependencies) return null;
  return raw as FileData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceClient({
  initialPrompt,
  workspace,
  userCredits,
  userId,
}: WorkspaceClientProps) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    workspace?.id ?? null
  );
  const [messages, setMessages] = useState<Message[]>(
    parseMessages(workspace?.messages)
  );
  const [fileData, setFileData] = useState<FileData | null>(
    parseFileData(workspace?.fileData)
  );
  const [credits, setCredits] = useState(userCredits);
  const [isGenerating, setIsGenerating] = useState(false);

  // Called by ChatPanel when the user submits a prompt
  const handleGenerate = useCallback(
    async (prompt: string, imageUrl?: string) => {
      if (isGenerating) return;

      if (credits < MIN_CREDITS_TO_GENERATE) {
        toast.error("Not enough credits. Please upgrade your plan.");
        return;
      }

      const userMessage: Message = {
        role: "user",
        content: prompt,
        ...(imageUrl ? { imageUrl } : {}),
      };

      // Optimistically append user message
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      try {
        const conversationHistory = [...messages, userMessage];

        const res = await fetch("/api/gen-ai-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            userId,
            messages: conversationHistory,
            fileData,
          }),
        });

        if (res.status === 402) {
          toast.error("Not enough credits. Please upgrade your plan.");
          // Remove the optimistic user message
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        if (res.status === 429) {
          toast.error("Too many requests. Please slow down.");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? "Generation failed");
        }

        const data = await res.json();

        // data shape: { workspaceId, assistantMessage, fileData, creditsRemaining }
        setWorkspaceId(data.workspaceId);
        setFileData(data.fileData);
        setCredits(data.creditsRemaining);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.assistantMessage },
        ]);

        // Sync URL without full navigation
        window.history.replaceState(
          null,
          "",
          `/workspace?id=${data.workspaceId}`
        );
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Something went wrong."
        );
        // Remove the optimistic user message on hard failure
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsGenerating(false);
      }
    },
    [credits, fileData, isGenerating, messages, userId, workspaceId]
  );

  // Called by CodePanel's "Improve with AI" banner
  const handleImprove = useCallback(
    async (error: string) => {
      if (!fileData || isGenerating) return;

      if (credits < MIN_CREDITS_TO_GENERATE) {
        toast.error("Not enough credits to use Improve with AI.");
        return;
      }

      const prompt = `There is an error in the preview:\n\n\`\`\`\n${error}\n\`\`\`\n\nPlease fix it.`;
      await handleGenerate(prompt);
    },
    [credits, fileData, handleGenerate, isGenerating]
  );

  // Called by CodePanel when files are patched by Cline SDK (Improve with AI flow)
  const handleFilePatch = useCallback((patches: FileData) => {
    setFileData(patches);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0a0a0a]">
      {/* Left — Chat */}
      <ChatPanel
        messages={messages}
        isGenerating={isGenerating}
        credits={credits}
        initialPrompt={initialPrompt}
        onGenerate={handleGenerate}
        userId={userId}
        workspaceId={workspaceId}
      />

      {/* Divider */}
      <div className="w-px shrink-0 bg-white/6" />

      {/* Right — Code + Preview */}
      <CodePanel
        fileData={fileData}
        isGenerating={isGenerating}
        onImprove={handleImprove}
        onFilePatch={handleFilePatch}
      />
    </div>
  );
}
