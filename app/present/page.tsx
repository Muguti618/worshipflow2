import type { Metadata } from "next";
import { PresentMode } from "@/components/wf/present-mode";
import { roomFromSearchParams } from "@/lib/present-room-query";

export const metadata: Metadata = {
  title: "Present — worshipflow2",
  description: "Presenter console — audience and remote pilot share a room id",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PresentPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <PresentMode room={roomFromSearchParams(sp)} />;
}
