"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importWorkspace } from "@/actions/projects";

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportProjectButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    startTransition(async () => {
      try {
        const fileContent = await file.text();
        const workspaceId = await importWorkspace(fileContent);
        toast.success("Workspace imported.");
        router.push(`/workspace?id=${workspaceId}`);
      } catch {
        toast.error("Failed to import workspace. Please check the file.");
      }
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={handleFileChange}
      />
      <Button
        variant="ghost"
        className="cursor-pointer text-white/60 hover:text-white/90"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        Import Workspace
      </Button>
    </>
  );
}
