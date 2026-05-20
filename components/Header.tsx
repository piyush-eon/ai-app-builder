import Link from "next/link";
import { UserButton, SignInButton, Show } from "@clerk/nextjs";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkUser } from "@/lib/checkUser";

export default async function Header() {
  await checkUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/6 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2 select-none">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <Zap className="h-4 w-4 fill-black text-black" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            BuildAI
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-[13px] font-medium text-white/50 hover:text-white/90 hover:bg-transparent"
              >
                Sign in
              </Button>
            </SignInButton>

            <SignInButton mode="modal">
              <Button
                size="sm"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black hover:bg-white/90 active:scale-95"
              >
                Get Started
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "h-8 w-8 rounded-full ring-1 ring-white/10 hover:ring-white/25 transition-all",
                  userButtonPopoverCard:
                    "bg-[#111111] border border-white/10 shadow-2xl shadow-black/60",
                  userButtonPopoverActionButton:
                    "text-white/70 hover:text-white hover:bg-white/5",
                  userButtonPopoverActionButtonText: "text-[13px]",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
