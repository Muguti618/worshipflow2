import type { Metadata } from "next";
import { AudienceView } from "@/components/wf/audience-view";
import { roomFromSearchParams } from "@/lib/present-room-query";

export const metadata: Metadata = {
  title: "Audience — LumenWorship",
  description: "Projector output — synced from Present or Remote",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AudiencePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <AudienceView room={roomFromSearchParams(sp)} />;
}
