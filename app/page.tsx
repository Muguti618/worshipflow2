import type { Metadata } from "next";
import { MarketingLanding } from "@/components/wf/marketing-landing";

export const metadata: Metadata = {
  title: "LumenWorship — Worship presentation, reimagined",
  description:
    "Plan setlists, manage multi-slide songs, present with audience view and remote control—all in your browser.",
};

export default function HomePage() {
  return <MarketingLanding />;
}
