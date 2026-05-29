import { WorkspaceClient } from "@/components/WorkspaceClient";
import { getWorkspaceUser, getWorkspaceById } from "@/actions/workspace";

interface WorkspacePageProps {
  searchParams: Promise<{ prompt?: string; id?: string }>;
}

export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const { prompt, id } = await searchParams;

  const user = await getWorkspaceUser();

  let workspace = null;
  if (id) {
    workspace = await getWorkspaceById(id, user.id);
  }

  return (
    <WorkspaceClient
      initialPrompt={prompt ?? null}
      workspace={workspace}
      userCredits={user.credits}
      userId={user.id}
      userPlan={user.plan}
    />
  );
}
