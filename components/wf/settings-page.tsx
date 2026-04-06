import Link from "next/link";
import { AppearanceSettings } from "@/components/wf/appearance-settings";
import { BillingSettings } from "@/components/wf/billing-settings";
import { LibraryDataSettings } from "@/components/wf/library-data-settings";
import { PresentationTransitionSettings } from "@/components/wf/presentation-transition-settings";

const APP_VERSION = "0.1.0";

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-wf-text">Settings</h1>
      <p className="mt-1 text-sm text-wf-muted">
        Appearance, your library, and presentation preferences.{" "}
        <Link href="/tutorial" className="font-medium text-violet-500 underline-offset-2 hover:underline">
          Tutorial
        </Link>{" "}
        for a full walkthrough.
      </p>

      <div className="mt-8 space-y-4">
        <AppearanceSettings />

        <BillingSettings />

        <LibraryDataSettings />

        <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-wf-text">Presenter shortcuts</h2>
          <p className="mt-1 text-xs text-wf-muted">
            While the Present tab is focused (not when typing in Quick verse).
          </p>
          <ul className="mt-3 space-y-2 text-sm text-wf-text">
            <li className="flex justify-between gap-4 border-b border-wf-border/80 pb-2">
              <span className="text-wf-muted">Next slide</span>
              <kbd className="rounded border border-wf-input-border bg-wf-bg/80 px-2 py-0.5 font-mono text-xs">
                →
              </kbd>{" "}
              or{" "}
              <kbd className="rounded border border-wf-input-border bg-wf-bg/80 px-2 py-0.5 font-mono text-xs">
                Space
              </kbd>
            </li>
            <li className="flex justify-between gap-4 border-b border-wf-border/80 pb-2">
              <span className="text-wf-muted">Previous slide</span>
              <kbd className="rounded border border-wf-input-border bg-wf-bg/80 px-2 py-0.5 font-mono text-xs">
                ←
              </kbd>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-wf-muted">Remote (same room)</span>
              <span className="text-right text-xs text-wf-muted">Arrow keys on /present/control</span>
            </li>
          </ul>
        </section>

        <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-wf-text">Presentation</h2>
          <p className="mt-1 text-xs text-wf-muted">
            Slide transitions apply on the presenter, audience screen, and dashboard preview when you
            change slides. Custom slide images and PowerPoint-style decks: use{" "}
            <strong className="font-medium text-wf-text">Songs</strong> or{" "}
            <strong className="font-medium text-wf-text">Setlists → Import slide images</strong> after
            exporting slides as PNG/JPEG — .pptx files cannot be opened in the browser.
          </p>
          <PresentationTransitionSettings />
          <label className="mt-4 flex items-center justify-between gap-4">
            <span className="text-sm text-wf-muted">Lower third safe area</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-violet-500" />
          </label>
        </section>

        <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-wf-text">AI (OpenAI)</h2>
          <p className="mt-2 text-xs leading-relaxed text-wf-muted">
            Add <code className="font-mono text-[10px] text-wf-text/80">OPENAI_API_KEY</code> and optional{" "}
            <code className="font-mono text-[10px] text-wf-text/80">OPENAI_MODEL</code> to{" "}
            <code className="font-mono text-[10px] text-wf-text/80">.env.local</code>, then restart{" "}
            <code className="font-mono text-[10px] text-wf-text/80">npm run dev</code>. The Assistant,{" "}
            <strong className="font-medium text-wf-text">Slide Studio</strong> (bridge +{" "}
            <strong className="font-medium text-wf-text">AI lyrics splitter</strong>{" "}
            <code className="font-mono text-[10px] text-wf-text/80">/api/ai/split-lyrics</code>), Bible
            suggestions, new-song layout, setlist scripture (topic queries), and custom blocks call ChatGPT on
            the server (your key is never sent to the browser).
          </p>
          <p className="mt-2 text-xs leading-relaxed text-wf-muted">
            Without a key, those endpoints return an error unless you set{" "}
            <code className="font-mono text-[10px] text-wf-text/80">AI_ALLOW_DUMMY=1</code> for offline
            preview data. Reference-style scripture lookup still uses bundled sample text (not OpenAI).
          </p>
        </section>

        <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-wf-text">About</h2>
          <p className="mt-2 text-sm text-wf-muted">
            <span className="font-medium text-wf-text">LumenWorship</span> · version {APP_VERSION}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-wf-muted">
            Browser-based worship flow: songs, setlists, Bible lookup, presenter, audience, and phone
            remote. A service worker can cache assets for offline use where supported.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-wf-muted">
            Questions or bugs: use your team&apos;s usual support channel; this demo app has no built-in
            crash reporter.
          </p>
        </section>
      </div>
    </div>
  );
}
