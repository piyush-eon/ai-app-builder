import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import Link from "next/link";
import { getUserProjects } from "@/actions/projects";
import { BlueTitle } from "@/components/reusables";
import { Button } from "@/components/ui/button";

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/4">
        <Zap className="h-5 w-5 text-white/20" />
      </div>
      <p className="mb-1 text-sm font-medium text-white/40">No projects yet</p>
      <p className="mb-6 text-xs text-white/20">
        Head to the homepage and describe what you want to build.
      </p>
      <Link
        href="/"
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
      >
        Start building
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const projects = await getUserProjects();

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <BlueTitle className="text-6xl">Projects</BlueTitle>
            <p className="mt-3 text-sm text-white/30">
              All your AI-generated apps in one place.
            </p>
          </div>
          <Link href="/">
            <Button className={"cursor-pointer"}>
              <Zap className="h-3 w-3 fill-black" />
              New project
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectCard projects={projects} />
        )}
      </div>
    </main>
  );
}
