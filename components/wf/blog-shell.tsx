import Link from "next/link";

export function BlogShell(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-wf-bg text-wf-text">
      <header className="border-b border-wf-border/80 bg-wf-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-wf-text transition hover:text-sky-300">
            ← LumenWorship
          </Link>
          <Link href="/blog" className="text-sm text-wf-muted transition hover:text-wf-text">
            All posts
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">{props.children}</main>
    </div>
  );
}
