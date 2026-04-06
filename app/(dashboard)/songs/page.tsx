import { SongsPage } from "@/components/wf/songs-page";

function songIdFromSearchParams(sp: Record<string, string | string[] | undefined>): string | undefined {
  const r = sp.song;
  const s = Array.isArray(r) ? r[0] : r;
  const t = typeof s === "string" ? s.trim() : "";
  return t || undefined;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <SongsPage initialSongId={songIdFromSearchParams(sp)} />;
}
