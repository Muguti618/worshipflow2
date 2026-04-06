import Link from "next/link";
import { SiteFooter } from "@/components/wf/site-footer";

export function LegalDocShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-wf-bg text-wf-text">
      <header className="border-b border-wf-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl">
          <Link
            href="/"
            className="text-sm font-medium text-sky-400 transition hover:text-sky-300 hover:underline"
          >
            ← worshipflow2 home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-wf-muted">Last updated: {lastUpdated}</p>
        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-wf-muted [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-wf-text [&_h2]:first:mt-0 [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-wf-text/95 [&_strong]:font-medium [&_strong]:text-wf-text/90 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
