import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { WorkspaceClient } from "@/components/WorkspaceClient";

interface WorkspacePageProps {
  searchParams: Promise<{ prompt?: string; id?: string }>;
}

export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { prompt, id } = await searchParams;

  // Load existing workspace if id provided
  let workspace = null;
  let user = null;

  user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, credits: true, plan: true },
  });

  if (!user) redirect("/");

  if (id) {
    workspace = await db.workspace.findUnique({
      where: { id, userId: user.id },
      select: {
        id: true,
        title: true,
        messages: true,
        fileData: true,
      },
    });
    // If workspace doesn't belong to this user, redirect
    if (!workspace) redirect("/");
  }

  return (
    <WorkspaceClient
      initialPrompt={prompt ?? null}
      workspace={workspace}
      userCredits={user.credits}
      userId={user.id}
    />
  );
}
