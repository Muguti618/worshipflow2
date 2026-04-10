"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { FreeSetlistLimitBanner } from "@/components/wf/free-setlist-limit-banner";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useAllSetlists } from "@/hooks/use-all-setlists";
import {
  broadcastDeckUpdated,
  broadcastSlideReset,
  DEFAULT_PRESENT_ROOM,
  postPresenterSlide,
  writeActiveDeck,
} from "@/lib/active-deck";
import { flattenSetlistToDeck } from "@/lib/setlist-flatten";
import { FREE_MAX_SETLISTS } from "@/lib/plan-limits";
import { getSetlistById } from "@/lib/setlists-resolve";
import { removeUserSetlist } from "@/lib/user-setlists-storage";

export function SetlistsPage() {
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const { setlists: all, version } = useAllSetlists();
  const setlistLimitBannerRef = useRef<HTMLDivElement>(null);

  const atFreeSetlistLimit = planReady && limitsApply && all.length >= FREE_MAX_SETLISTS;

  const sendToPresenter = useCallback((id: string) => {
    const def = getSetlistById(id);
    if (!def) return;
    writeActiveDeck(flattenSetlistToDeck(def.items), id);
    broadcastDeckUpdated();
    broadcastSlideReset(DEFAULT_PRESENT_ROOM);
    void postPresenterSlide(DEFAULT_PRESENT_ROOM, 0);
  }, []);

  const deleteYours = useCallback((id: string, name: string) => {
    if (!confirm(`Delete “${name}”? This cannot be undone.`)) return;
    removeUserSetlist(id);
  }, []);

  const totalSlides = (id: string) => {
    const def = getSetlistById(id);
    if (!def) return 0;
    return flattenSetlistToDeck(def.items).length;
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {atFreeSetlistLimit ? <FreeSetlistLimitBanner ref={setlistLimitBannerRef} /> : null}
      <div className="flex-1 p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setlists</h1>
          <p className="mt-1 text-sm text-wf-muted">
            Build your order of service here, then send it to the presenter from this page or the
            dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/setlists/new"
            data-wf-tour="tour-setlists-new"
            onClick={(e) => {
              if (atFreeSetlistLimit) {
                e.preventDefault();
                setlistLimitBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            title={atFreeSetlistLimit ? "Setlist limit — upgrade for more" : "Create a new setlist"}
            className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition ${
              atFreeSetlistLimit
                ? "border border-amber-500/40 bg-amber-500/10 text-amber-100/90 hover:bg-amber-500/15"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            New setlist
          </Link>
          <Link
            href="/present?room=default"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/[0.12] bg-wf-card/60 px-4 text-sm font-semibold text-wf-text hover:border-white/18"
          >
            Presenter
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-10">
        {all.length > 0 ? (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-wf-muted">
              Your setlists
            </h2>
            <ul className="space-y-2" key={version}>
              {all.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-[16px] border border-white/[0.08] bg-wf-card/45 px-4 py-3 backdrop-blur-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-wf-text">{s.name}</p>
                    <p className="text-[11px] text-wf-muted">
                      {s.items.length} items · {totalSlides(s.id)} slides
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sendToPresenter(s.id)}
                      className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/10"
                    >
                      Send to presenter
                    </button>
                    <Link
                      href={`/setlists/${s.id}/edit`}
                      className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-wf-text hover:border-white/20"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteYours(s.id, s.name)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-wf-muted hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-wf-muted">
            No setlists yet.{" "}
            <Link href="/setlists/new" className="text-sky-400 hover:underline">
              Create one
            </Link>
            .
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
