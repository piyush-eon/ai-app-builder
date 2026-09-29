"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import type { ProjectSummary } from "@/types/project";

export type { ProjectSummary } from "@/types/project";

// ─── Get all workspaces for the current user ──────────────────────────────────

export async function getUserProjects(): Promise<ProjectSummary[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) redirect("/");

  const workspaces = await db.workspace.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return workspaces.map((w) => {
    const msgs = Array.isArray(w.messages) ? w.messages : [];
    const firstUserMsg = msgs.find(
      (m): m is { role: string; content: string } =>
        typeof m === "object" &&
        m !== null &&
        (m as Record<string, unknown>).role === "user"
    );

    return {
      id: w.id,
      title: w.title,
      firstPrompt: firstUserMsg?.content?.slice(0, 120) ?? null, // ← new
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      messageCount: Array.isArray(w.messages) ? w.messages.length : 0,
    };
  });
}

// ─── Import a workspace as a new project ──────────────────────────────────────

export async function importWorkspace(fileContent: string): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) redirect("/");

  let parsed: { title?: unknown; messages?: unknown; fileData?: unknown };
  try {
    parsed = eval(`(${fileContent})`);
  } catch {
    throw new Error("Invalid workspace file");
  }

  const workspace = await db.workspace.create({
    data: {
      userId: user.id,
      title: typeof parsed.title === "string" ? parsed.title : null,
      messages: (parsed.messages ?? []) as never,
      fileData: (parsed.fileData ?? null) as never,
    },
    select: { id: true },
  });

  revalidatePath("/projects");

  return workspace.id;
}

// ─── Delete a workspace ───────────────────────────────────────────────────────

export async function deleteProject(workspaceId: string): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) redirect("/");

  await db.workspace.deleteMany({
    where: { id: workspaceId, userId: user.id },
  });

  revalidatePath("/projects");
}
