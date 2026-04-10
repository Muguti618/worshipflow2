"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FreeSetlistLimitBanner } from "@/components/wf/free-setlist-limit-banner";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useAllSetlists } from "@/hooks/use-all-setlists";
import { FREE_MAX_SETLISTS } from "@/lib/plan-limits";
import { addUserSetlistAsync, createBlankUserSetlist } from "@/lib/user-setlists-storage";

export default function NewSetlistPage() {
  const router = useRouter();
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const { setlists } = useAllSetlists();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);

  const atFreeSetlistLimit = planReady && limitsApply && setlists.length >= FREE_MAX_SETLISTS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atFreeSetlistLimit) {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const def = createBlankUserSetlist(name, description);
    const saved = await addUserSetlistAsync(def);
    router.push(`/setlists/${saved.id}/edit`);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {atFreeSetlistLimit ? <FreeSetlistLimitBanner ref={bannerRef} /> : null}
      <div className="mx-auto w-full max-w-md flex-1 p-6 lg:p-8">
        <Link href="/setlists" className="text-xs font-medium text-wf-muted hover:text-wf-text">
          ← Setlists
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">New setlist</h1>
        <p className="mt-1 text-sm text-wf-muted">
          Next, add songs from your library or create new ones — slides stay in sync with Songs.
        </p>

        <form
          onSubmit={(ev) => void handleSubmit(ev)}
          className={`mt-8 space-y-4 ${atFreeSetlistLimit ? "pointer-events-none opacity-45" : ""}`}
          aria-disabled={atFreeSetlistLimit}
        >
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wider text-wf-muted">
              Name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Easter Sunday"
              disabled={atFreeSetlistLimit}
              className="mt-1 h-11 w-full rounded-[12px] border border-white/[0.08] bg-wf-card/60 px-3 text-sm text-wf-text outline-none focus:ring-2 focus:ring-sky-500/25 disabled:cursor-not-allowed"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wider text-wf-muted">
              Description (optional)
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note for your team"
              disabled={atFreeSetlistLimit}
              className="mt-1 h-11 w-full rounded-[12px] border border-white/[0.08] bg-wf-card/60 px-3 text-sm text-wf-text outline-none focus:ring-2 focus:ring-sky-500/25 disabled:cursor-not-allowed"
            />
          </label>
          <button
            type="submit"
            disabled={atFreeSetlistLimit}
            className="w-full rounded-[12px] bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create and edit
          </button>
        </form>
      </div>
    </div>
  );
}
