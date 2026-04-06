"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { setGuestDashboardAllow } from "@/lib/guest-access";
import { SiteFooter } from "@/components/wf/site-footer";
import { PublicLyricSplitter } from "@/components/wf/public-lyric-splitter";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** After register/sign-in, open Upgrade page to pick monthly vs yearly. */
const UPGRADE_PAGE_NEXT = encodeURIComponent("/upgrade");

const features = [
  {
    icon: "🎵",
    title: "Multi-slide songs",
    body: "Each song is a full slide deck—verses, choruses, and bridges—so Present always matches your library.",
  },
  {
    icon: "📅",
    title: "Setlists & flow",
    body: "Build Sunday orders with songs, scripture, prayer blocks, and moments. One tap sends the whole deck to Present.",
  },
  {
    icon: "🎯",
    title: "Present & audience",
    body: "Operator view, clean audience output, and optional phone or tablet remote—aligned by room.",
  },
  {
    icon: "✝️",
    title: "Bible & AI helpers",
    body: "Look up passages, preview on the dashboard, and use OpenAI-powered verse ideas and slide formatting when you add your API key.",
  },
] as const;

export function MarketingLanding() {
  const router = useRouter();
  const { session, hydrated } = useAuthSession();

  useEffect(() => {
    if (!hydrated || !session) return;
    router.replace("/dashboard");
  }, [hydrated, session, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-wf-bg px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/[0.12] border-t-sky-500" />
        <p className="text-sm text-wf-muted">Loading…</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-wf-bg text-sm text-wf-muted">
        Opening your dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-wf-bg text-wf-text">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-[min(520px,90vw)] w-[min(520px,90vw)] rounded-full bg-blue-500/[0.14] blur-[120px]" />
        <div className="absolute -right-24 top-1/4 h-[min(440px,80vw)] w-[min(440px,80vw)] rounded-full bg-white/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[min(380px,70vw)] w-[min(380px,70vw)] rounded-full bg-slate-600/[0.05] blur-[90px]" />
      </div>

      <header className="relative z-10 border-b border-wf-border/80 bg-wf-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="text-lg font-bold tracking-tight">worshipflow2</span>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/blog"
              className="rounded-[10px] px-3 py-2 text-sm font-medium text-wf-muted transition hover:bg-wf-text/[0.06] hover:text-wf-text"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="rounded-[10px] px-3 py-2 text-sm font-medium text-wf-muted transition hover:bg-wf-text/[0.06] hover:text-wf-text"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-[10px] bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:brightness-110"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">
            Worship presentation, reimagined
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-center text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-slate-200 via-slate-300 to-slate-500 bg-clip-text text-transparent">
              Your songs, setlists, and slides
            </span>
            <span className="text-wf-text"> in one calm flow.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-relaxed text-wf-muted">
            Plan services in the browser, preview scripture and lyrics, then walk through every slide
            with Present, Audience, and an optional phone remote—without juggling five different tools.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-[14px] bg-blue-600 hover:bg-blue-500 px-8 text-sm font-bold text-white shadow-xl shadow-black/35 transition hover:brightness-110 sm:w-auto"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-[14px] border border-wf-border bg-wf-card/60 px-8 text-sm font-semibold text-wf-text backdrop-blur transition hover:border-white/18 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
          {!isSupabaseConfigured() ? (
            <p className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setGuestDashboardAllow();
                  router.push("/dashboard");
                }}
                className="text-sm text-wf-muted underline decoration-wf-muted/40 underline-offset-4 transition hover:text-sky-300 hover:decoration-sky-500/50"
              >
                Try the app without an account
              </button>
              <span className="mt-1 block text-center text-[11px] text-wf-muted/80">
                Local demo only — data stays in this browser.
              </span>
            </p>
          ) : null}
        </section>

        <section
          id="lyric-splitter"
          className="scroll-mt-24 border-t border-wf-border/60 bg-wf-bg py-14 sm:py-20"
          aria-labelledby="lyric-splitter-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <PublicLyricSplitter />
          </div>
        </section>

        <section
          className="border-t border-wf-border/60 bg-wf-card/20 py-16 backdrop-blur-sm"
          aria-labelledby="mw-features-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="mw-features-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Built for worship teams
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-wf-muted">
              Everything ties back to your library and setlists—so last-minute changes don’t break the
              flow.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <li
                  key={f.title}
                  className="rounded-[18px] border border-wf-border bg-wf-card/50 p-6 shadow-lg shadow-black/20 backdrop-blur-md"
                >
                  <span className="text-2xl" aria-hidden>
                    {f.icon}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-wf-text">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-wf-muted">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-wf-border/60 py-16"
          aria-labelledby="mw-testimonials-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="mw-testimonials-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
            >
              What teams are saying
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-wf-muted">
              Video stories from worship leaders and tech teams—first testimonial below; add your embed when
              the clip is ready.
            </p>
            <article className="mx-auto mt-10 max-w-3xl">
              <div className="overflow-hidden rounded-[20px] border border-wf-border bg-wf-card/50 shadow-xl shadow-black/25 backdrop-blur-md">
                <div
                  className="relative aspect-video bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-wf-bg"
                  role="img"
                  aria-label="Video testimonial placeholder"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <span
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-2xl text-sky-200/90"
                      aria-hidden
                    >
                      ▶
                    </span>
                    <p className="text-sm font-semibold text-white/85">Video testimonial</p>
                    <p className="max-w-xs text-xs leading-relaxed text-white/50">
                      Placeholder—replace with iframe (YouTube / Vimeo) or{" "}
                      <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px] text-sky-200/80">
                        &lt;video&gt;
                      </code>
                    </p>
                  </div>
                </div>
                <div className="border-t border-wf-border/80 p-6 sm:p-8">
                  <blockquote className="text-center">
                    <p className="text-lg font-medium leading-relaxed text-wf-text sm:text-xl">
                      &ldquo;Placeholder quote—we&apos;ll drop in real words from a worship pastor or tech
                      director once your first testimonial is recorded.&rdquo;
                    </p>
                    <footer className="mt-5 text-sm">
                      <cite className="not-italic font-semibold text-wf-text">Alex Morgan</cite>
                      <span className="mt-0.5 block text-wf-muted">Worship director · Sample Church</span>
                    </footer>
                  </blockquote>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          className="border-t border-wf-border/60 bg-wf-card/15 py-20 backdrop-blur-sm sm:py-24"
          aria-labelledby="mw-pricing-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="mw-pricing-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Pricing
            </h2>
            <p className="mx-auto mt-6 max-w-md text-center text-base leading-[1.65] text-wf-muted">
              All amounts are in <strong className="font-semibold text-wf-text">GBP (£)</strong>. Start free
              with no card; Pro is billed through <strong className="font-semibold text-wf-text">Stripe</strong>{" "}
              when you&apos;re ready.
            </p>
            <div className="mx-auto mt-16 grid max-w-4xl gap-10 md:grid-cols-2 md:gap-12 lg:gap-14">
              <div className="flex flex-col rounded-[20px] border border-wf-border bg-wf-card/40 p-8 shadow-lg shadow-black/15 backdrop-blur-md sm:p-9">
                <h3 className="text-lg font-semibold text-wf-text">Free</h3>
                <p className="mt-2 text-3xl font-bold tracking-tight text-wf-text">
                  £0
                  <span className="text-base font-normal text-wf-muted"> forever</span>
                </p>
                <p className="mt-5 text-sm leading-relaxed text-wf-muted">
                  Core worship flow with clear limits—ideal for a single room laptop and a small library.
                </p>
                <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.14em] text-wf-muted/90">
                  What&apos;s included
                </p>
                <ul className="mt-4 flex-1 space-y-3.5 text-sm leading-relaxed text-wf-muted">
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Up to 3 songs</strong> saved in your
                      library
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">1 setlist</strong> for your order of
                      service
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Present &amp; Audience</strong> on your
                      network (operator + projector views)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">5 Bible verse beams</strong> to the
                      room (quick scripture on screen), then you&apos;ll need Pro for more
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Limited slide backgrounds</strong>—a
                      small preset set (e.g. core moods / colours), not the full background library or
                      custom image freedom
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Basic transitions</strong> (standard
                      fade / push—no full transition catalogue)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Bible lookup &amp; dashboard preview</strong>{" "}
                      for planning
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">AI slide splitting once</strong> when you
                      create a new song (paste lyrics → AI layout → save). Further songs use manual splitting
                      unless you upgrade
                    </span>
                  </li>
                </ul>
                <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.14em] text-wf-muted/90">
                  Not included on Free
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-wf-muted/85">
                  <li className="flex gap-2">
                    <span className="text-white/35" aria-hidden>
                      —
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/75">No phone or tablet remote</strong>{" "}
                      (Pro unlocks room pilot from another device)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/35" aria-hidden>
                      —
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/75">No full AI suite</strong>—after your one
                      free new-song AI split: no Slide Studio AI, Assistant chat, unlimited song AI, or smart
                      suggestions elsewhere
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/35" aria-hidden>
                      —
                    </span>
                    <span>
                      No priority support—self-serve via tutorial &amp; in-app copy only
                    </span>
                  </li>
                </ul>
                <Link
                  href="/register"
                  className="mt-10 inline-flex h-11 items-center justify-center rounded-[12px] border border-wf-border px-5 text-sm font-semibold text-wf-text transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Get started free
                </Link>
              </div>
              <div className="relative flex flex-col rounded-[20px] border border-white/[0.12] bg-gradient-to-b from-slate-500/[0.08] to-wf-card/60 p-8 shadow-xl shadow-black/40 backdrop-blur-md sm:p-9 sm:pr-10">
                <span className="absolute right-5 top-5 rounded-full bg-slate-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-200/95 ring-1 ring-sky-500/25">
                  Pro
                </span>
                <h3 className="text-lg font-semibold text-wf-text">Pro</h3>
                <p className="mt-5 text-sm leading-relaxed text-wf-muted">
                  Full access for weekly services—unlimited library, remote, AI, and priority support.
                </p>

                <div className="mt-10 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-10 text-center sm:px-8">
                  <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-0">
                    <span
                      className="pb-1 text-3xl font-bold leading-none text-white/90 sm:text-4xl"
                      aria-hidden
                    >
                      £
                    </span>
                    <span className="bg-gradient-to-b from-white via-white to-slate-200 bg-clip-text text-6xl font-extrabold leading-none tracking-tight text-transparent sm:text-7xl">
                      25
                    </span>
                    <span className="mb-1.5 text-lg font-medium text-wf-muted sm:text-xl">/month</span>
                  </div>
                  <p className="mt-8 text-sm leading-relaxed text-wf-muted">
                    <span className="text-wf-text/90">£250/year</span> if you prefer annual billing —{" "}
                    <span className="text-emerald-200/90">save £50</span> vs paying monthly for a year.
                  </p>
                </div>

                <p className="mx-auto mt-6 max-w-xs text-center text-xs leading-relaxed text-wf-muted/85">
                  Pick monthly or yearly at checkout. Cancel or switch anytime in the billing portal; tax and
                  renewal dates show in Stripe before you pay.
                </p>

                <ul className="mt-12 flex-1 space-y-3.5 border-t border-white/[0.08] pt-10 text-sm leading-relaxed text-wf-muted">
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Unlimited songs</strong> and{" "}
                      <strong className="font-medium text-wf-text/90">unlimited setlists</strong>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Phone &amp; tablet remote</strong>—same
                      Wi‑Fi, same room id, full deck sync for pilots and volunteers
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Unlimited Bible verse beams</strong> to
                      Audience (scripture moments without a cap)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Full AI Assistant</strong>—chat,
                      Slide Studio, lyrics splitter, scripture ideas, and related tools (where you connect
                      your OpenAI key or your plan includes usage—see account settings)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Full slide backgrounds</strong>—full
                      mood library, custom image URLs, full-bleed graphics, Ken Burns motion where supported
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">All slide transitions</strong> and
                      presenter polish options
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Present, Audience &amp; dashboard</strong>{" "}
                      without Free-tier caps
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Library import &amp; export</strong>{" "}
                      (JSON backup) for peace of mind and device moves
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-400/90" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <strong className="font-medium text-wf-text/90">Priority support</strong>—faster
                      responses from the team when something blocks Sunday
                    </span>
                  </li>
                </ul>
                <Link
                  href={`/register?next=${UPGRADE_PAGE_NEXT}`}
                  className="mt-10 inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-blue-600 hover:bg-blue-500 px-4 text-sm font-bold text-white shadow-lg shadow-black/35 transition hover:brightness-110"
                >
                  Get Pro
                </Link>
                <p className="mt-5 text-center text-xs leading-relaxed text-wf-muted">
                  New here? We&apos;ll open Upgrade after sign-up.{" "}
                  <Link
                    href={`/login?next=${UPGRADE_PAGE_NEXT}`}
                    className="font-medium text-sky-400 underline-offset-2 hover:underline"
                  >
                    Sign in to upgrade
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-t border-wf-border/60 py-16"
          aria-labelledby="mw-demo-video-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="mw-demo-video-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
            >
              See worshipflow2 in action
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-wf-muted">
              A short walkthrough: dashboard, setlist → Present, Audience view, and phone remote—placeholder
              until you record a screen capture.
            </p>
            <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[20px] border border-wf-border bg-wf-card/50 shadow-2xl shadow-black/30 backdrop-blur-md">
              <div
                className="relative aspect-video bg-gradient-to-br from-slate-950/90 via-wf-card to-slate-950/90"
                role="img"
                aria-label="Product demo video placeholder"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-2xl text-white/75"
                    aria-hidden
                  >
                    ▶
                  </span>
                  <p className="text-sm font-semibold text-white/85">Product demo video</p>
                  <p className="max-w-sm text-xs leading-relaxed text-white/50">
                    Placeholder—drop in a 60–90s screen recording (setlists, Present, Audience, remote).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="rounded-[22px] border border-white/[0.1] bg-gradient-to-br from-slate-500/[0.08] via-wf-card/80 to-slate-600/[0.06] p-8 text-center sm:p-10">
            <h2 className="text-xl font-bold sm:text-2xl">Ready when you are</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-wf-muted">
              Create an account to sync with your team (with Supabase), or sign in to open your
              dashboard.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-white px-6 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-[12px] border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
