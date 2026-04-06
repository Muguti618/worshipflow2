import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/wf/blog-shell";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { SiteFooter } from "@/components/wf/site-footer";

export const metadata: Metadata = {
  title: "Blog — worshipflow2",
  description:
    "Free worship lyric formatter tips, worship slide maker ideas, and lighter alternatives to ProPresenter and EasyWorship.",
};

export default function BlogIndexPage() {
  return (
    <>
      <BlogShell>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">Blog</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">For worship leaders & techs</h1>
        <p className="mt-3 text-sm leading-relaxed text-wf-muted">
          Short, practical notes on lyric formatting, Sunday workflow, and browser-based presentation—plus
          our free{" "}
          <Link href="/#lyric-splitter" className="font-medium text-sky-400/90 hover:underline">
            lyric splitter on the homepage
          </Link>
          .
        </p>
        <ul className="mt-10 space-y-6">
          {BLOG_POSTS.map((p) => (
            <li key={p.slug}>
              <article className="rounded-2xl border border-wf-border bg-wf-card/40 p-5 shadow-lg shadow-black/15 backdrop-blur-sm transition hover:border-white/15">
                <time className="text-[11px] font-medium uppercase tracking-wider text-wf-muted" dateTime={p.date}>
                  {p.date}
                </time>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  <Link href={`/blog/${p.slug}`} className="text-wf-text hover:text-sky-300">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-wf-muted">{p.description}</p>
                <Link
                  href={`/blog/${p.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-sky-400/90 hover:underline"
                >
                  Read more →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </BlogShell>
      <SiteFooter />
    </>
  );
}
