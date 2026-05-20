"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowUp, Paperclip, Zap, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type { Message } from "./WorkspaceClient";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client (public bucket, no auth needed for upload URL) ───────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  credits: number;
  initialPrompt: string | null;
  onGenerate: (prompt: string, imageUrl?: string) => Promise<void>;
  userId: string;
  workspaceId: string | null;
}

export function ChatPanel({
  messages,
  isGenerating,
  credits,
  initialPrompt,
  onGenerate,
  userId,
  workspaceId,
}: ChatPanelProps) {
  const { user } = useUser();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [, startTransition] = useTransition();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Auto-submit the initial prompt once on first load
  useEffect(() => {
    if (!initialPrompt || hasAutoSubmitted || messages.length > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasAutoSubmitted(true);
    startTransition(() => {
      onGenerate(initialPrompt);
    });
  }, [hasAutoSubmitted, initialPrompt, messages.length, onGenerate]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    setInput("");
    setPendingImageUrl(null);
    await onGenerate(trimmed, pendingImageUrl ?? undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${workspaceId ?? "new"}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("workspace-images")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage
        .from("workspace-images")
        .getPublicUrl(path);

      setPendingImageUrl(data.publicUrl);
    } catch {
      // silent — image upload failure shouldn't block text
    } finally {
      setIsUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const canSubmit = input.trim().length > 0 && !isGenerating && credits > 0;

  return (
    <div className="flex w-[320px] shrink-0 flex-col bg-[#0d0d0d]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
            <Zap className="h-3 w-3 fill-black text-black" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-white/60">
            BuildAI
          </span>
        </div>
        <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-white/30">
          {credits} credit{credits !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {messages.length === 0 && !isGenerating && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-white/20">
              Describe what you want to build…
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                // User bubble — right aligned
                <div className="flex items-start justify-end gap-2">
                  <div className="max-w-[85%] space-y-1.5">
                    {msg.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        className="max-h-40 w-full rounded-lg object-cover"
                      />
                    )}
                    <div className="rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2.5">
                      <p className="text-[13px] leading-relaxed text-white/80">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                  {user?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.imageUrl}
                      alt={user.fullName ?? "You"}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full"
                    />
                  ) : (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/50">
                      {user?.firstName?.[0] ?? "U"}
                    </div>
                  )}
                </div>
              ) : (
                // Assistant bubble — left aligned
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white">
                    <Zap className="h-3 w-3 fill-black text-black" />
                  </div>
                  <div className="min-w-0 rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-2.5">
                    <div className="prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed text-white/70 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-blue-300/80 [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isGenerating && (
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white">
                <Zap className="h-3 w-3 fill-black text-black" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-3.5">
                {[0, 0.15, 0.3].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/6 p-3">
        {/* Pending image preview */}
        {pendingImageUrl && (
          <div className="relative mb-2 w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImageUrl}
              alt="pending upload"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <button
              onClick={() => setPendingImageUrl(null)}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white/60 hover:text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            "rounded-xl border bg-white/4 transition-colors",
            isGenerating
              ? "border-white/4 opacity-60"
              : "border-white/8 hover:border-white/12"
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={
              credits === 0 ? "No credits remaining…" : "Ask AI to modify…"
            }
            rows={1}
            className="w-full resize-none bg-transparent px-3.5 pb-2 pt-3 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none"
            style={{ maxHeight: 160 }}
          />

          <div className="flex items-center justify-between px-2 pb-2">
            {/* Image upload */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isGenerating || isUploading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/6 hover:text-white/50 disabled:opacity-40"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Send */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                canSubmit
                  ? "bg-white text-black hover:bg-white/90 active:scale-95"
                  : "bg-white/8 text-white/20"
              )}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[10px] text-white/15">
          ⏎ to send · Shift+⏎ for new line
        </p>
      </div>
    </div>
  );
}
