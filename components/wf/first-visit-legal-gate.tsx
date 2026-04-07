"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "worshipflow2-first-visit-legal-v1";

export function FirstVisitLegalGate() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!mounted || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/70 p-4 pb-8 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wf-legal-gate-title"
    >
      <div className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.12] bg-wf-card shadow-2xl shadow-black/50">
        <div className="border-b border-white/[0.08] bg-gradient-to-r from-sky-500/15 to-blue-500/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
            Before you continue
          </p>
          <h2 id="wf-legal-gate-title" className="mt-1 text-xl font-bold text-wf-text">
            Cookies &amp; legal
          </h2>
        </div>
        <div className="space-y-4 px-5 py-5 text-sm leading-relaxed text-wf-muted">
          <p>
            We use <strong className="font-medium text-wf-text">essential cookies</strong> and similar
            technologies so the site works (sign-in, preferences, and security). With your consent we may
            also use cookies to remember this choice and improve the service.
          </p>
          <p>
            By clicking <strong className="font-medium text-wf-text">Accept &amp; continue</strong>, you
            confirm that you have read and agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-xs text-wf-muted/85">
            You can change browser cookie settings anytime. See the Privacy Policy for how we handle your
            data.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[0.08] bg-wf-bg/40 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={accept}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-5 text-sm font-bold text-white shadow-lg shadow-black/30 transition hover:brightness-110"
          >
            Accept &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
