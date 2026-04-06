import Link from "next/link";

const link = "text-wf-muted transition hover:text-violet-300 hover:underline";
const heading = "text-xs font-semibold uppercase tracking-wider text-wf-text/90";

export function SiteFooter() {
  return (
    <footer className="border-t border-wf-border bg-wf-card/25">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="text-sm font-bold tracking-tight text-wf-text">LumenWorship</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-wf-muted">
              Worship planning, multi-slide songs, setlists, Present &amp; Audience, and optional phone
              remote—built for teams who serve from the browser.
            </p>
          </div>
          <div>
            <h2 className={heading}>Product</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/" className={link}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#mw-features-heading" className={link}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#mw-pricing-heading" className={link}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#mw-testimonials-heading" className={link}>
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="/#mw-demo-video-heading" className={link}>
                  Watch demo
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={heading}>Account</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/login" className={link}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className={link}>
                  Create account
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className={link}>
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={heading}>Legal</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className={link}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={link}>
                  Privacy Policy
                </Link>
              </li>
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-wf-muted/80">
              Questions about billing or your data? Use the contact channel listed in your Pro plan or
              reach out through the email you used at signup.
            </p>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-wf-border/80 pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-wf-muted">
            © {new Date().getFullYear()} LumenWorship. All rights reserved.
          </p>
          <p className="text-xs text-wf-muted">
            Made with <span className="text-fuchsia-400/90">♥</span> by{" "}
            <span className="font-medium text-wf-text/90">Forma</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
