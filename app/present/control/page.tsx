import type { Metadata } from "next";
import { RemoteControl } from "@/components/wf/remote-control";
import { roomFromSearchParams } from "@/lib/present-room-query";

export const metadata: Metadata = {
  title: "Remote — worshipflow2",
  description: "Phone / tablet slide control for the same room",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RemoteControlPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <RemoteControl room={roomFromSearchParams(sp)} />;
}
