import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/wf/blog-shell";
import { SiteFooter } from "@/components/wf/site-footer";

export const metadata: Metadata = {
  title: "ProPresenter Alternative in the Browser | LumenWorship",
  description:
    "Looking for a ProPresenter alternative? A lighter browser workflow for lyrics, scripture, and setlists—without a media server.",
};

export default function BlogPostProPresenterAlternative() {
  return (
    <>
      <BlogShell>
        <article className="prose prose-invert max-w-none prose-p:text-wf-muted prose-headings:text-wf-text prose-a:text-sky-400">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-wf-text sm:text-[2rem]">
            ProPresenter alternative when you want less rigging
          </h1>
          <p className="text-sm text-wf-muted/90">
            <time dateTime="2026-04-06">April 6, 2026</time>
          </p>

          <p className="mt-8 text-base leading-relaxed">
            <strong className="text-wf-text">ProPresenter</strong> is a powerhouse: staging media, complex
            arrangements, and broadcast-grade output. Not every room needs that whole stack. Sometimes the
            question behind <strong className="text-wf-text">ProPresenter alternative</strong> is simpler:
            can we run lyrics and scripture reliably, from one laptop, with a clean audience view and a sane
            rehearsal flow?
          </p>

          <p className="mt-4 text-base leading-relaxed">
            A browser-based path can be the right fit when your team mostly needs strong lyric slides,
            occasional scripture, and a shared setlist order—without installing a full production suite on
            every machine. The trade-off is honest: you are not replacing every ProPresenter feature; you are
            reducing moving parts for teams who were drowning in setup time.
          </p>

          <p className="mt-4 text-base leading-relaxed">
            If you want to test the philosophy before you compare licenses, start with the free{" "}
            <Link href="/#lyric-splitter">lyric splitter</Link> on our homepage—format lyrics first—then
            explore <Link href="/register">LumenWorship</Link> for Present, Audience, and optional remote
            control when you are ready to standardize on one calm workflow.
          </p>

          <p className="mt-8 rounded-xl border border-wf-border bg-wf-card/50 p-4 text-sm">
            <strong className="text-wf-text">Try first:</strong>{" "}
            <Link href="/#lyric-splitter" className="font-medium text-sky-400 hover:underline">
              No-sign-up lyric formatter
            </Link>{" "}
            ·{" "}
            <Link href="/" className="font-medium text-sky-400 hover:underline">
              Product home
            </Link>
          </p>
        </article>
      </BlogShell>
      <SiteFooter />
    </>
  );
}
