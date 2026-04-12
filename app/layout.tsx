import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { FirstVisitLegalGate } from "@/components/wf/first-visit-legal-gate";
import { RootTutorialTour } from "@/components/wf/root-tutorial-tour";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "worshipflow2 — Worship presentation, reimagined",
  description:
    "Browser-based worship pilot: AI slide formatting, scripture search, remote control, and offline-friendly caching.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Runs once in the initial HTML before paint; avoids next/script + React 19 client warnings.
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var k='worshipflow2-theme';var t=localStorage.getItem(k);document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();",
          }}
        />
      </head>
      <body
        className="min-h-full bg-wf-bg text-wf-text"
        suppressHydrationWarning
      >
        <SwRegister />
        <RootTutorialTour>
          <FirstVisitLegalGate />
          {children}
        </RootTutorialTour>
      </body>
    </html>
  );
}
