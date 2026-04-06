import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/wf/blog-shell";
import { SiteFooter } from "@/components/wf/site-footer";

export const metadata: Metadata = {
  title: "Worship Slide Maker Free — Plan Lyrics Before Sunday | LumenWorship",
  description:
    "Worship slide maker free option: split lyrics into slides in your browser before you invest in heavy software.",
};

export default function BlogPostWorshipSlideMakerFree() {
  return (
    <>
      <BlogShell>
        <article className="prose prose-invert max-w-none prose-p:text-wf-muted prose-headings:text-wf-text prose-a:text-sky-400">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-wf-text sm:text-[2rem]">
            Worship slide maker free: start with the lyric problem
          </h1>
          <p className="text-sm text-wf-muted/90">
            <time dateTime="2026-04-06">April 6, 2026</time>
          </p>

          <p className="mt-8 text-base leading-relaxed">
            If you are searching for a <strong className="text-wf-text">worship slide maker free</strong>{" "}
            option, you probably have two pressures at once: you need readable slides for the room, and you
            do not want another subscription before you know the workflow fits your team. The highest-leverage
            first step is not animations or lower-thirds—it is turning pasted lyrics into sensible slide breaks
            so the band and the congregation are not racing the screen.
          </p>

          <p className="mt-4 text-base leading-relaxed">
            A good free path is to format lyrics in the browser: mark sections, keep lines short enough for
            older eyes, and preview how many lines stack per slide. When that feels right, you can carry the
            same discipline into a full tool—setlists, scripture blocks, and an operator view that stays in
            sync with what the room sees.
          </p>

          <p className="mt-4 text-base leading-relaxed">
            LumenWorship puts a <strong className="text-wf-text">worship slide maker free</strong> entry point
            on the homepage on purpose: try the{" "}
            <Link href="/#lyric-splitter">lyric splitter without signing up</Link>, then create an account if
            you want your library, setlists, and Present. You solve Sunday&apos;s readability problem first; the
            account is for keeping the work.
          </p>

          <p className="mt-8 rounded-xl border border-wf-border bg-wf-card/50 p-4 text-sm">
            <strong className="text-wf-text">Start here:</strong>{" "}
            <Link href="/#lyric-splitter" className="font-medium text-sky-400 hover:underline">
              Free lyric splitter on the landing page
            </Link>
          </p>
        </article>
      </BlogShell>
      <SiteFooter />
    </>
  );
}
