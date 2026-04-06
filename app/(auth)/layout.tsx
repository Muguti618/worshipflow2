import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description: "Sign in or create a worshipflow2 account on this device.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full bg-wf-bg">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-0 h-[min(480px,80vw)] w-[min(480px,80vw)] rounded-full bg-blue-500/[0.18] blur-[100px]" />
        <div className="absolute -right-20 top-1/4 h-[min(400px,70vw)] w-[min(400px,70vw)] rounded-full bg-slate-500/[0.1] blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 h-[min(360px,60vw)] w-[min(360px,60vw)] rounded-full bg-slate-600/[0.08] blur-[80px]" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex justify-center px-4 pt-8 sm:justify-start sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[12px] border border-wf-border bg-wf-card/60 px-3 py-2 text-sm font-medium text-wf-muted backdrop-blur-md transition hover:border-white/15 hover:text-wf-text"
          >
            ← worshipflow2 home
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
