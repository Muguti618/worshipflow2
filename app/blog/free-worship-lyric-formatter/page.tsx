import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/wf/blog-shell";
import { SiteFooter } from "@/components/wf/site-footer";

export const metadata: Metadata = {
  title: "Free Worship Lyric Formatter for Church Screens | worshipflow2",
  description:
    "Looking for a free worship lyric formatter? Format verses and choruses for projection—respect section tags, no install, try it in the browser first.",
};

export default function BlogPostFreeWorshipLyricFormatter() {
  return (
    <>
      <BlogShell>
        <article className="prose prose-invert max-w-none prose-p:text-wf-muted prose-headings:text-wf-text prose-a:text-sky-400">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-wf-text sm:text-[2rem]">
            Free worship lyric formatter (for projection, not Word)
          </h1>
          <p className="text-sm text-wf-muted/90">
            <time dateTime="2026-04-06">April 6, 2026</time>
          </p>

          <p className="mt-8 text-base leading-relaxed">
            Most worship leaders do not need another document—they need lyrics that read well on a screen
            from thirty feet back. A <strong className="text-wf-text">free worship lyric formatter</strong>{" "}
            should respect how songs are actually built: verses, choruses, bridges, and tags—not just a wall
            of text. That is why we ship a public tool you can use without creating an account: paste your
            licensed lyrics, set how many lines belong on each slide, and preview the result instantly.
          </p>

          <p className="mt-4 text-base leading-relaxed">
            The goal is simple readability. Section markers like{" "}
            <span className="font-mono text-sm text-sky-300/90">[Chorus]</span> and blank lines between
            blocks help the formatter understand structure. You can copy the output as plain text for
            rehearsal notes, or bring the same habits into{" "}
            <Link href="/register">worshipflow2</Link> when you are ready to save songs and build setlists.
          </p>

          <p className="mt-4 text-base leading-relaxed">
            Searching for a <strong className="text-wf-text">free worship lyric formatter</strong> usually
            means you are stuck between a PDF chord chart and Sunday morning. Solve that problem first—try
            the{" "}
            <Link href="/#lyric-splitter">homepage lyric splitter</Link>—then decide whether you want a full
            presentation workflow with Present, Audience, and scripture in the same calm browser surface.
          </p>

          <p className="mt-8 rounded-xl border border-wf-border bg-wf-card/50 p-4 text-sm">
            <strong className="text-wf-text">Try it:</strong>{" "}
            <Link href="/#lyric-splitter" className="font-medium text-sky-400 hover:underline">
              Free lyric splitter — no sign-up
            </Link>
          </p>
        </article>
      </BlogShell>
      <SiteFooter />
    </>
  );
}
