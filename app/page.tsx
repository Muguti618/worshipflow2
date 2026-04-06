import type { Metadata } from "next";
import { MarketingLanding } from "@/components/wf/marketing-landing";

export const metadata: Metadata = {
  title: "LumenWorship — Free worship lyric formatter & slide maker",
  description:
    "Free AI lyric splitter on the homepage—no sign-up. Format lyrics for projection, then plan setlists, scripture, Present & Audience. ProPresenter & EasyWorship alternative for teams who want a calm browser workflow.",
  keywords: [
    "free worship lyric formatter",
    "worship slide maker free",
    "ProPresenter alternative",
    "EasyWorship alternative free",
    "lyric splitter",
  ],
};

export default function HomePage() {
  return <MarketingLanding />;
}
