"use client";

import { useEffect, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import {
  Eye,
  Code2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileData } from "./WorkspaceClient";

// ─── Default files shown before first generation ─────────────────────────────

const PLACEHOLDER_FILES = {
  "/App.js": {
    code: `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 14 }}>Your app will appear here</p>
      </div>
    </div>
  );
}`,
  },
};

// ─── Base dependencies always present in every sandbox ───────────────────────

const BASE_DEPENDENCIES: Record<string, string> = {
  "react-router-dom": "latest", // Routing
  "lucide-react": "latest", // Icons
  recharts: "latest", // Charts
  "date-fns": "latest", // Date utils
  "framer-motion": "latest", // Animation
  "react-hook-form": "latest", // Forms
  "@hookform/resolvers": "latest",
  zod: "latest",
  "@radix-ui/react-dialog": "latest", // UI primitives
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-tabs": "latest",
  "@radix-ui/react-tooltip": "latest",
  "@radix-ui/react-accordion": "latest",
  "@radix-ui/react-select": "latest",
  axios: "latest", // HTTP
  clsx: "latest", // Utilities
  "class-variance-authority": "latest",
  "tailwind-merge": "latest",
};

// ─── Tab type ─────────────────────────────────────────────────────────────────

type ActiveTab = "preview" | "code";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CodePanelProps {
  fileData: FileData | null;
  isGenerating: boolean;
  onImprove: (error: string) => Promise<void>;
  onFilePatch: (patches: FileData) => void;
}

// ─── Inner component — needs to be inside SandpackProvider ───────────────────

function SandpackInner({
  isGenerating,
  activeTab,
  setActiveTab,
  onImprove,
}: {
  isGenerating: boolean;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  onImprove: (error: string) => Promise<void>;
}) {
  const { sandpack, listen } = useSandpack();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Listen for Sandpack runtime errors
  useEffect(() => {
    unsubscribeRef.current = listen((msg) => {
      // Sandpack emits action messages for runtime errors
      if (
        msg.type === "action" &&
        "action" in msg &&
        msg.action === "show-error"
      ) {
        const errMsg =
          "message" in msg && typeof msg.message === "string"
            ? msg.message
            : "An error occurred in the preview.";
        setPreviewError(errMsg);
      }
      // Clear error on successful compile
      if (msg.type === "done" || msg.type === "success") {
        setPreviewError(null);
      }
    });

    return () => unsubscribeRef.current?.();
  }, [listen]);

  // Clear error when generation starts (new code incoming)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isGenerating) setPreviewError(null);
  }, [isGenerating]);

  const handleImprove = async () => {
    if (!previewError || isImproving) return;
    setIsImproving(true);
    setActiveTab("preview"); // keep user on preview while fix streams
    try {
      await onImprove(previewError);
    } finally {
      setIsImproving(false);
      setPreviewError(null);
    }
  };

  //   const activeFile = sandpack.activeFile;

  return (
    <div className="flex h-full flex-col">
      {/* ── Tabs + Actions ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/6 px-2">
        <div className="flex items-center">
          <TabButton
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Preview"
          />
          <TabButton
            active={activeTab === "code"}
            onClick={() => setActiveTab("code")}
            icon={<Code2 className="h-3.5 w-3.5" />}
            label="Code"
          />
        </div>

        <div className="flex items-center gap-1 pr-1">
          {/* Refresh */}
          <button
            onClick={() => sandpack.resetAllFiles()}
            title="Reset files"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/6 hover:text-white/50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Open in CodeSandbox */}
          <button
            onClick={() => {
              const url = `https://codesandbox.io/api/v1/sandboxes/define?parameters=${encodeURIComponent(
                JSON.stringify({
                  files: Object.fromEntries(
                    Object.entries(sandpack.files).map(([path, f]) => [
                      path.replace(/^\//, ""),
                      { content: f.code },
                    ])
                  ),
                })
              )}`;
              window.open(url, "_blank");
            }}
            title="Open in CodeSandbox"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/6 hover:text-white/50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading overlay during generation */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            <p className="text-xs text-white/30">Generating your app…</p>
          </div>
        )}

        {/* Error banner */}
        {previewError && !isGenerating && activeTab === "preview" && (
          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-red-500/20 bg-[#1a0a0a] p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium text-red-400/80">
                  Preview error
                </p>
                <p className="truncate text-[11px] text-red-300/50">
                  {previewError}
                </p>
              </div>
              <button
                onClick={handleImprove}
                disabled={isImproving}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-400/80 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
              >
                {isImproving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                {isImproving ? "Fixing…" : "Improve with AI"}
              </button>
            </div>
          </div>
        )}

        {/* Sandpack panels — always rendered, toggled with visibility */}
        <SandpackLayout
          style={{
            height: "100vh",
            border: "none",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          {/* Preview */}
          <div
            className={cn(
              "h-full w-full",
              activeTab === "preview" ? "block" : "hidden"
            )}
          >
            <SandpackPreview
              style={{ height: "100%" }}
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
            />
          </div>

          {/* Code editor */}
          <div
            className={cn(
              "flex h-full w-full",
              activeTab === "code" ? "flex" : "hidden"
            )}
          >
            <SandpackFileExplorer
              style={{
                height: "100vh",
                width: "180px",
                borderRight: "0.5px solid gray",
              }}
            />
            <SandpackCodeEditor
              style={{
                height: "100vh",
                flex: 1,
              }}
              showTabs
              showLineNumbers
              showInlineErrors
              closableTabs
              readOnly
            />
          </div>
        </SandpackLayout>
      </div>
    </div>
  );
}

// ─── Tab button sub-component ─────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2.5 text-xs transition-colors",
        active
          ? "border-b-2 border-blue-400 text-white"
          : "border-b-2 border-transparent text-white/30 hover:text-white/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Outer component — sets up SandpackProvider ───────────────────────────────

export function CodePanel({
  fileData,
  isGenerating,
  onImprove,
  onFilePatch,
}: CodePanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

  // Switch to preview automatically when new code arrives
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fileData) setActiveTab("preview");
  }, [fileData]);

  const files = fileData?.files ?? PLACEHOLDER_FILES;
  const dependencies = {
    ...BASE_DEPENDENCIES,
    ...(fileData?.dependencies ?? {}),
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SandpackProvider
        key={JSON.stringify(files)} // remount when file structure changes
        template="react"
        theme={dracula}
        files={files}
        customSetup={{ dependencies }}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
      >
        <SandpackInner
          isGenerating={isGenerating}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onImprove={onImprove}
        />
      </SandpackProvider>
    </div>
  );
}
