"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTutorialTour } from "@/components/wf/tutorial-tour-context";
import { TUTORIAL_TOUR_STEPS } from "@/lib/tutorial-tour-steps";

const SECTIONS = [
  {
    id: "overview",
    title: "How LumenWorship fits together",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <p>
          LumenWorship is built around <strong className="font-medium text-wf-text">songs</strong>{" "}
          (each with <strong className="font-medium text-wf-text">many slides</strong>),{" "}
          <strong className="font-medium text-wf-text">setlists</strong> that order those songs and
          other moments, and a <strong className="font-medium text-wf-text">presenter</strong> that
          walks through every slide in order. AI features in this build use{" "}
          <strong className="font-medium text-sky-200/90">dummy test data</strong> so you can
          click through the whole product without API keys.
        </p>
        <p>
          Typical Sunday flow: build or import songs in <Link href="/songs" className="text-sky-400 hover:underline">Songs</Link>
          , arrange them in <Link href="/setlists" className="text-sky-400 hover:underline">Setlists</Link>
          , pick the setlist on the{" "}
          <Link href="/dashboard" className="text-sky-400 hover:underline">
            Dashboard
          </Link>
          , then open <strong className="font-medium text-wf-text">Present</strong> for the operator
          and <strong className="font-medium text-wf-text">Audience</strong> on the projector.
        </p>
      </div>
    ),
  },
  {
    id: "songs-slides",
    title: "Songs and multiple slides",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <p>
          A <strong className="font-medium text-wf-text">song</strong> is not a single slide. It is a
          stack of slides: verse 1, chorus, bridge, etc. The presenter advances slide by slide across
          the whole service.
        </p>
        <ul className="list-inside list-disc space-y-2 border-l border-white/[0.1] pl-4">
          <li>
            In <Link href="/songs" className="text-sky-400 hover:underline">Songs</Link>, each
            block is one slide (title + lines). Use <strong className="text-wf-text">↑ ↓</strong> to
            reorder slides inside that song.
          </li>
          <li>
            <strong className="text-wf-text">Background</strong> (image or colour) applies to the
            whole song by default; you can extend the model later so individual slides override it.
          </li>
          <li>
            Use <strong className="text-wf-text">+ New</strong> to add songs; everything in your library
            is yours to edit.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "studio",
    title: "Slide Studio (paste → many slides)",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <p>
          <Link href="/studio" className="text-sky-400 hover:underline">Slide Studio</Link> is
          for experimenting: paste raw lyrics, set{" "}
          <strong className="font-medium text-wf-text">max lines per slide</strong>, and watch the
          breakdown list. Changing lines per slide directly changes{" "}
          <strong className="font-medium text-wf-text">how many slides</strong> you get from the
          same lyrics.
        </p>
        <p>
          <strong className="font-medium text-wf-text">Spontaneous bridge</strong> calls the{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-wf-text">/api/ai/bridge</code>{" "}
          endpoint — it returns <strong className="text-wf-text">dummy lines plus suggested slide
          pairs</strong> for testing. Copy lines into a new song when you like them.
        </p>
      </div>
    ),
  },
  {
    id: "setlists",
    title: "Setlists → deck → Present",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <p>
          A <strong className="font-medium text-wf-text">setlist</strong> is the order of service.
          Each row can be a <strong className="font-medium text-wf-text">linked song</strong> (slides
          come from your library) or a custom block (prayer, scripture, etc.) with its own slides.
        </p>
        <ul className="list-inside list-disc space-y-2 border-l border-white/[0.1] pl-4">
          <li>
            In the editor, <strong className="text-wf-text">drag the grip</strong> to reorder items.
          </li>
          <li>
            The <strong className="text-wf-text">Dashboard</strong> setlist dropdown pushes the flat
            slide deck to Present (every slide from every item, in order).
          </li>
          <li>
            If one song has 4 slides, it consumes 4 steps in Present — not one.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "bible-ai",
    title: "Bible and AI verse finder",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <p>
          <Link href="/bible" className="text-sky-400 hover:underline">Bible</Link> supports
          reference lookup plus <strong className="font-medium text-wf-text">Get AI verse options</strong>
          — curated dummy matches for common themes (anxiety, hope, love, …). Each option shows
          reference, full text, and a short blurb. Pick one to load the preview and slide strip.
        </p>
        <p>
          The <Link href="/ai" className="text-sky-400 hover:underline">AI Assistant</Link> chat
          uses keyword-based <strong className="text-wf-text">dummy replies</strong> so you can test
          the conversation UI. Replace with a hosted model when you are ready.
        </p>
      </div>
    ),
  },
  {
    id: "present",
    title: "Present, Audience, Remote",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <ul className="list-inside list-disc space-y-2 border-l border-emerald-500/25 pl-4">
          <li>
            <strong className="text-wf-text">Present</strong> — operator view, next slide, keyboard
            arrows / space.
          </li>
          <li>
            <strong className="text-wf-text">Audience</strong> — output for the room; fullscreen is
            optional.
          </li>
          <li>
            <strong className="text-wf-text">Remote</strong> — same room id; advance slides from a
            phone (top bar shortcut).
          </li>
        </ul>
        <p>
          All three read the same <strong className="font-medium text-wf-text">active deck</strong>{" "}
          synced for room <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">default</code>{" "}
          in this demo.
        </p>
      </div>
    ),
  },
  {
    id: "settings",
    title: "Settings and data",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-wf-muted">
        <p>
          Your songs and setlists live in <strong className="font-medium text-wf-text">browser
          storage</strong> on this device (demo MVP). There is no account sync until you wire a
          backend. Open <Link href="/settings" className="text-sky-400 hover:underline">Settings</Link>{" "}
          for export, import, and other options.
        </p>
      </div>
    ),
  },
] as const;

export function TutorialPage() {
  const router = useRouter();
  const { startTour, active } = useTutorialTour();
  const [openId, setOpenId] = useState<string>(SECTIONS[0]!.id);

  const toc = useMemo(
    () =>
      SECTIONS.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="text-sky-400/90 hover:text-sky-200 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              setOpenId(s.id);
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {s.title}
          </a>
        </li>
      )),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl p-6 pb-16 lg:max-w-4xl lg:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            Always available
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">Tutorial</h1>
          <p className="mt-2 max-w-2xl text-sm text-wf-muted">
            How the app is meant to work in this build — especially{" "}
            <strong className="font-medium text-wf-text">multi-slide songs</strong>, setlists, and
            dummy AI for testing.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-[12px] border border-white/[0.1] px-4 py-2 text-sm font-medium text-wf-muted hover:border-white/16 hover:text-wf-text"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="relative mb-8 overflow-hidden rounded-[22px] border-2 border-white/15 bg-gradient-to-br from-slate-500/[0.1] via-slate-600/[0.06] to-slate-700/[0.05] p-6 shadow-[0_0_50px_-12px_rgba(56,189,248,0.12)] lg:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/12 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-slate-500/12 blur-3xl"
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-200/90">
          Interactive spotlight
        </p>
        <h2 className="mt-2 text-xl font-bold text-wf-text lg:text-2xl">
          See each control light up
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-wf-muted">
          Start the guided tour: the rest of the screen dims and a{" "}
          <strong className="font-medium text-sky-200/90">pulsing glow</strong> frames the real
          button or field for that step ({TUTORIAL_TOUR_STEPS.length} stops). You can still click the
          highlighted control. The tour starts on the <strong className="font-medium text-wf-text">Dashboard</strong>{" "}
          and visits Songs, Setlists, Slide Studio, and Bible. Press{" "}
          <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono text-[11px] text-wf-text">Esc</kbd>{" "}
          or Skip to exit — Tutorial stays in the sidebar and top bar anytime.
        </p>
        <button
          type="button"
          onClick={() => {
            startTour();
            router.push("/dashboard");
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-[14px] bg-slate-600 hover:bg-slate-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          <span className="text-lg" aria-hidden>
            ✨
          </span>
          Start guided spotlight tour
        </button>
        {active ? (
          <p className="mt-3 text-xs text-sky-200/80">
            Tour is active — use the panel at the bottom of the screen (Next / Back / Skip).
          </p>
        ) : null}
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        <nav
          aria-label="Tutorial sections"
          className="mb-8 rounded-[16px] border border-white/[0.08] bg-wf-card/40 p-4 backdrop-blur-md lg:sticky lg:top-20 lg:mb-0 lg:self-start"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-wf-muted">On this page</p>
          <ul className="mt-3 space-y-2 text-sm">{toc}</ul>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-wf-muted">Shortcuts</p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs">
              <Link href="/songs" className="text-sky-400/90 hover:underline">
                Songs
              </Link>
              <Link href="/studio" className="text-sky-400/90 hover:underline">
                Slide Studio
              </Link>
              <Link href="/setlists" className="text-sky-400/90 hover:underline">
                Setlists
              </Link>
              <Link href="/bible" className="text-sky-400/90 hover:underline">
                Bible
              </Link>
              <Link href="/ai" className="text-sky-400/90 hover:underline">
                AI Assistant
              </Link>
            </div>
          </div>
        </nav>

        <div className="space-y-4">
          {SECTIONS.map((s) => {
            const expanded = openId === s.id;
            return (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 rounded-[18px] border border-white/[0.08] bg-wf-card/35 backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenId((id) => (id === s.id ? "" : s.id))}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={expanded}
                >
                  <h2 className="text-base font-bold text-wf-text lg:text-lg">{s.title}</h2>
                  <span className="shrink-0 text-wf-muted">{expanded ? "−" : "+"}</span>
                </button>
                {expanded ? <div className="border-t border-white/[0.06] px-5 py-4">{s.body}</div> : null}
              </section>
            );
          })}
        </div>
      </div>

      <aside className="mt-10 rounded-[16px] border border-sky-500/15 bg-sky-500/[0.06] p-5">
        <p className="text-sm font-semibold text-slate-100">Dummy AI reminder</p>
        <p className="mt-2 text-sm leading-relaxed text-wf-muted">
          Chat, bridge generation, and Bible topic matching use{" "}
          <strong className="font-medium text-wf-text">fixed test content</strong> from{" "}
          <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs">lib/ai-dummy-data.ts</code> and
          related routes. Swap those functions for real model calls when you deploy.
        </p>
      </aside>
    </div>
  );
}
