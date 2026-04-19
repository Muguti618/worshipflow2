"use client";

import Link from "next/link";
import { useEffect } from "react";

type Variant = "presenter" | "audience" | "remote";

const copy: Record<Variant, { title: string; body: string }> = {
  presenter: {
    title: "Another setlist is now presenting",
    body: "Only one setlist can be live at a time. This window is closing.",
  },
  audience: {
    title: "This screen is no longer live",
    body: "The presenter switched to a different setlist. Only one presentation runs at a time.",
  },
  remote: {
    title: "Room no longer active",
    body: "Presenting moved to another setlist. Open the new room from the dashboard.",
  },
};

export function PresentationSupersededOverlay({
  open,
  variant,
}: {
  open: boolean;
  variant: Variant;
}) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      window.close();
      window.location.assign("/dashboard");
    }, 2200);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  const { title, body } = copy[variant];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center text-white">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-white/70">{body}</p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
