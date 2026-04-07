"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { setGuestDashboardAllow } from "@/lib/guest-access";
import { SiteFooter } from "@/components/wf/site-footer";
import { PublicLyricSplitter } from "@/components/wf/public-lyric-splitter";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Check, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";

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

const howItWorks = [
  {
    step: "01",
    title: "Plan in one place",
    body: "Songs, scripture, and service order live together—no copy-paste between apps when the set changes.",
  },
  {
    step: "02",
    title: "Open Present",
    body: "Advance slides from the operator screen; Audience stays clean and readable on the projector or stream.",
  },
  {
    step: "03",
    title: "Pilot from the room",
    body: "Optional phone or tablet remote keeps volunteers aligned on the same deck and the same moment.",
  },
] as const;

const sundayOutcomes = [
  {
    title: "Fewer tabs on Saturday night",
    body: "One URL for planning, rehearsal tweaks, and Sunday morning—less context-switching when time is tight.",
  },
  {
    title: "Readable lyrics, every time",
    body: "Section-aware splitting and preview mean your congregation sees lines that breathe—not walls of text.",
  },
  {
    title: "Scripture without friction",
    body: "Look up passages, beam verses to the room when you need them, and stay in flow with the rest of the set.",
  },
] as const;

type IntroOffer = {
  pill: string;
  introPrice: string;
  introDetail: string;
  thenLabel?: string;
  thenPrice: string;
  thenDetail: string;
  note?: string;
};

function PricingCard({ 
  tier, 
  price, 
  period, 
  description, 
  features, 
  notIncluded,
  ctaText, 
  ctaLink,
  popular = false,
  annualPrice,
  annualSavings,
  introOffer,
}: { 
  tier: string; 
  price: string; 
  period: string; 
  description: string; 
  features: string[]; 
  notIncluded?: string[];
  ctaText: string; 
  ctaLink: string;
  popular?: boolean;
  annualPrice?: string;
  annualSavings?: string;
  introOffer?: IntroOffer;
}) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className={`relative flex flex-col rounded-2xl border ${
      popular 
        ? "border-sky-500/30 bg-gradient-to-b from-sky-500/10 via-wf-card/60 to-wf-card/40 shadow-2xl shadow-sky-500/10" 
        : "border-wf-border bg-wf-card/40"
    } p-6 backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:shadow-black/25 hover:-translate-y-1`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
            <Zap className="h-3 w-3" />
            MOST POPULAR
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold text-wf-text">{tier}</h3>

        {introOffer ? (
          <div className="mt-4 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.12] via-sky-500/[0.08] to-wf-card/60 p-4 shadow-inner shadow-black/20">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/90">
                {introOffer.pill}
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  {introOffer.introPrice}
                </span>
                <span className="pb-1 text-sm font-medium text-wf-muted">{introOffer.introDetail}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-white/[0.08] pt-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm text-sky-300">
                  →
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-wf-muted/90">
                    {introOffer.thenLabel ?? "Then"}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-wf-text">
                    {introOffer.thenPrice}{" "}
                    <span className="text-sm font-normal text-wf-muted">{introOffer.thenDetail}</span>
                  </p>
                </div>
              </div>
              {introOffer.note ? (
                <p className="mt-3 text-xs leading-relaxed text-wf-muted/90">{introOffer.note}</p>
              ) : null}
            </div>
            {annualPrice ? (
              <p className="text-xs text-wf-muted">
                Prefer yearly? <span className="font-medium text-wf-text">{annualPrice}/year</span> at
                checkout
                {annualSavings ? (
                  <>
                    {" "}
                    — save <span className="font-medium text-emerald-400/90">{annualSavings}</span> vs 12
                    months at £25
                  </>
                ) : null}
                .
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-wf-text">{price}</span>
              <span className="text-wf-muted">/{period}</span>
            </div>
            {annualPrice && (
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                className="mt-2 text-xs text-sky-400 hover:text-sky-300 transition"
              >
                {isAnnual ? `Switch to monthly (${price}/${period})` : `Save with annual (${annualPrice}/year)`}
              </button>
            )}
            {isAnnual && annualSavings && (
              <p className="mt-2 text-xs text-emerald-400/90 font-medium">
                Save {annualSavings}/year
              </p>
            )}
          </>
        )}

        <p className="mt-4 text-sm text-wf-muted leading-relaxed">{description}</p>
      </div>

      <Link
        href={ctaLink}
        className={`inline-flex h-11 w-full items-center justify-center rounded-xl font-semibold transition-all duration-200 ${
          popular
            ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:scale-105"
            : "border border-wf-border bg-white/5 text-wf-text hover:bg-white/10"
        }`}
      >
        {ctaText}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>

      <div className="mt-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-wf-muted">
          What&apos;s included
        </p>
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                popular ? "text-sky-400" : "text-emerald-400/70"
              }`} />
              <span className="text-wf-muted">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {notIncluded && notIncluded.length > 0 && (
        <div className="mt-6 pt-6 border-t border-wf-border/50">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-wf-muted/70">Not included</p>
          <ul className="space-y-2">
            {notIncluded.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-wf-muted/40 mt-0.5">—</span>
                <span className="text-wf-muted/70">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent hover:to-white transition-all"
          >
            worshipflow2
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/#lyric-splitter"
              className="rounded-[10px] px-3 py-2 text-sm font-medium text-wf-muted transition hover:bg-wf-text/[0.06] hover:text-wf-text"
            >
              Lyric formatter
            </Link>
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
              className="rounded-[10px] bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition-all hover:shadow-xl"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400 backdrop-blur-sm mb-6">
              <Sparkles className="h-3 w-3" />
              Worship presentation, reimagined
            </div>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              <span className="bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Your songs, setlists, and slides
              </span>
              <br />
              <span className="text-wf-text">in one calm flow.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-wf-muted sm:text-xl">
              Plan in the browser, preview scripture and lyrics, then walk the room with Present, Audience,
              and an optional phone remote—without tab-hopping across five tools.
            </p>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {["No card to start", "Browser-first", "Present + Audience"].map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-wf-muted backdrop-blur-sm"
                >
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-8 text-sm font-bold text-white shadow-xl shadow-black/35 transition-all hover:scale-105 hover:shadow-2xl"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-wf-border bg-wf-card/60 px-8 text-sm font-semibold text-wf-text backdrop-blur transition hover:border-white/18"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-5">
              <a
                href="#lyric-splitter"
                className="text-sm font-medium text-sky-400/95 underline-offset-4 transition hover:text-sky-300 hover:underline"
              >
                Try the free lyric formatter first
              </a>
              <span className="text-wf-muted"> — no account needed.</span>
            </p>
            {!isSupabaseConfigured() && (
              <button
                type="button"
                onClick={() => {
                  setGuestDashboardAllow();
                  router.push("/dashboard");
                }}
                className="mt-4 text-sm text-wf-muted underline decoration-wf-muted/40 underline-offset-4 transition hover:text-sky-300"
              >
                Try the app without an account (local demo)
              </button>
            )}
          </div>
        </section>

        <section className="border-t border-wf-border/60 bg-gradient-to-b from-wf-bg to-wf-card/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How Sunday flows</h2>
              <p className="mt-2 text-wf-muted">From mid-week planning to the last song—stay in one workspace</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {howItWorks.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-wf-border/90 bg-wf-card/40 p-6 backdrop-blur-md transition hover:border-sky-500/25 hover:bg-wf-card/55"
                >
                  <span className="text-3xl font-bold text-sky-400/40">{item.step}</span>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-wf-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="lyric-splitter" className="scroll-mt-24 border-t border-wf-border/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublicLyricSplitter />
          </div>
        </section>

        <section className="border-t border-wf-border/60 bg-wf-card/20 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for worship teams</h2>
              <p className="mt-2 text-wf-muted">Everything ties back to your library and setlists</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-wf-border bg-wf-card/50 p-6 backdrop-blur-md transition hover:border-white/[0.12]"
                >
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-wf-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-wf-border/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for real Sundays</h2>
              <p className="mt-2 text-wf-muted">Outcomes your team will actually feel in the room</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {sundayOutcomes.map((o) => (
                <div
                  key={o.title}
                  className="rounded-xl border border-wf-border/80 bg-wf-bg/80 p-6"
                >
                  <h3 className="font-semibold">{o.title}</h3>
                  <p className="mt-2 text-sm text-wf-muted">{o.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Improved Pricing Section */}
        <section className="border-t border-wf-border/60 bg-gradient-to-b from-wf-card/15 to-wf-bg py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 mb-4">
                <Crown className="h-3 w-3" />
                Simple, transparent pricing
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Choose the plan that fits
              </h2>
              <p className="mt-3 text-wf-muted max-w-xl mx-auto">
                All amounts in <strong className="text-wf-text">GBP (£)</strong>. Start free, upgrade when
                you&apos;re ready.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/[0.14] via-amber-500/[0.06] to-sky-500/[0.08] px-5 py-5 text-center shadow-lg shadow-black/25 sm:px-8 sm:py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-200/95">
                Checkout code
              </p>
              <p className="mt-3 font-mono text-2xl font-extrabold tracking-[0.08em] text-white sm:text-3xl">
                WORSHIPHIM15
              </p>
              <p className="mt-3 text-sm leading-relaxed text-wf-muted">
                Use code <span className="font-semibold text-wf-text">WORSHIPHIM15</span> at checkout for{" "}
                <strong className="font-semibold text-wf-text">£15/month forever</strong> — your rate stays
                at £15 for as long as you keep an active Pro subscription.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
              <PricingCard
                tier="Free"
                price="£0"
                period="forever"
                description="Perfect for small teams getting started or trying out the flow."
                features={[
                  "Up to 3 songs in your library",
                  "1 setlist for your order of service",
                  "Present & Audience on your network",
                  "5 Bible verse beams to the room",
                  "Limited slide backgrounds (preset moods)",
                  "Basic transitions (fade/push)",
                  "Bible lookup & dashboard preview",
                  "One-time AI slide splitting per song"
                ]}
                notIncluded={[
                  "No phone or tablet remote",
                  "No full AI suite (Slide Studio, Assistant chat)",
                  "No priority support"
                ]}
                ctaText="Start free"
                ctaLink="/register"
              />

              <PricingCard
                tier="Pro"
                price="£25"
                period="month"
                annualPrice="£250"
                annualSavings="£50"
                introOffer={{
                  pill: "Next 2 months only",
                  introPrice: "£15",
                  introDetail: "/ month · locked for life",
                  thenLabel: "After the window",
                  thenPrice: "£25",
                  thenDetail: "/ month for new sign-ups",
                  note: "Enter WORSHIPHIM15 at checkout for £15/month forever (same rate while Pro stays active). Offer window: next two months; after it closes, new sign-ups pay £25/month unless they use a valid code. Full Pro features from day one. Billed via Stripe.",
                }}
                description="Full access for weekly services—unlimited songs, setlists, remote, AI (where configured), and priority support."
                features={[
                  "Unlimited songs & unlimited setlists",
                  "Phone & tablet remote control",
                  "Unlimited Bible verse beams",
                  "Full AI Assistant suite (Slide Studio, chat, etc.)",
                  "Full slide backgrounds + custom images",
                  "All slide transitions & presenter polish",
                  "Library import & export (JSON backup)",
                  "Priority support"
                ]}
                ctaText="Get Pro"
                ctaLink={`/register?next=${UPGRADE_PAGE_NEXT}`}
                popular={true}
              />
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-wf-muted">
                <Link href="/login" className="text-sky-400 hover:text-sky-300 transition">
                  Already have an account? Sign in to upgrade
                </Link>
              </p>
              <p className="mt-2 text-xs text-wf-muted/70">
                Cancel anytime. Tax and renewal dates shown before payment via Stripe.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-wf-border/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 items-center lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See the flow in action</h2>
                <p className="mt-3 text-wf-muted">
                  Build or tweak a setlist, open Present, peek at Audience, and hand someone the remote—so volunteers know exactly what Sunday feels like.
                </p>
                <div className="mt-6 space-y-3">
                  {["Dashboard → setlist order and last-minute swaps", "Operator screen + clean Audience output", "Optional room remote on a second device"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-wf-muted">
                      <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-6 text-sm font-bold text-white shadow-lg shadow-black/30 transition hover:scale-105"
                  >
                    Explore in the app
                  </Link>
                  <a
                    href="#lyric-splitter"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-wf-border px-6 text-sm font-medium text-wf-text transition hover:bg-white/5"
                  >
                    Try the free formatter
                  </a>
                </div>
              </div>
              <div className="relative">
                <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 text-center">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 mb-4">
                        <span className="text-2xl">▶</span>
                      </div>
                      <p className="text-sm font-medium text-white/90">Demo video</p>
                      <p className="text-xs text-white/50 mt-1">Watch the walkthrough</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-sky-500/10 via-wf-card/90 to-blue-500/5 p-8 text-center sm:p-12">
            <div className="relative">
              <h2 className="text-2xl font-bold sm:text-3xl">Ready when you are</h2>
              <p className="mx-auto mt-3 max-w-md text-wf-muted">
                Create an account to sync with your team, or sign in to jump straight to your dashboard.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-7 text-sm font-bold text-white shadow-lg transition hover:scale-105"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 bg-white/[0.03] px-7 text-sm font-semibold text-wf-text backdrop-blur-sm transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-6 text-sm text-wf-muted">
                <a href="#lyric-splitter" className="text-sky-400 hover:text-sky-300 transition">
                  Try the lyric formatter
                </a>{" "}
                first—no sign-up required.
              </p>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}