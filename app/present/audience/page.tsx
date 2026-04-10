import type { Metadata } from "next";
import { AudienceView } from "@/components/wf/audience-view";
import { roomFromSearchParams } from "@/lib/present-room-query";

export const metadata: Metadata = {
  title: "Audience — worshipflow2",
  description: "Projector output — synced from Present or Remote",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AudiencePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const reelRaw = sp.reelFs;
  const reelFs = reelRaw === "1" || (Array.isArray(reelRaw) && reelRaw[0] === "1");
  return (
    <AudienceView room={roomFromSearchParams(sp)} marketingAutoFullscreen={reelFs} />
  );
}
