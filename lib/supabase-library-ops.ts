import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeckSlide, SetlistDefinition, SetlistItem } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";

type SongRow = {
  id: string;
  user_id: string;
  legacy_client_id: string | null;
  title: string;
  tags: string[] | null;
  structure: string;
  background_url: string | null;
  background_color: string | null;
  slides: unknown;
};

type SetlistRow = {
  id: string;
  user_id: string;
  legacy_client_id: string | null;
  name: string;
  description: string | null;
  items: unknown;
};

export function rowToSong(row: SongRow): LibrarySong {
  const slides = Array.isArray(row.slides) ? (row.slides as DeckSlide[]) : [];
  const song: LibrarySong = {
    id: row.id,
    title: row.title,
    tags: row.tags ?? [],
    structure: row.structure ?? "Custom",
    slides,
  };
  if (row.background_url?.trim()) song.backgroundUrl = row.background_url.trim();
  if (row.background_color?.trim()) song.backgroundColor = row.background_color.trim();
  return song;
}

export function rowToSetlist(row: SetlistRow): SetlistDefinition {
  const items = Array.isArray(row.items) ? (row.items as SetlistItem[]) : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    items,
  };
}

function songToInsert(song: LibrarySong, userId: string): Record<string, unknown> {
  return {
    id: song.id,
    user_id: userId,
    legacy_client_id: null,
    title: song.title,
    tags: song.tags,
    structure: song.structure,
    background_url: song.backgroundUrl?.trim() || null,
    background_color: song.backgroundColor?.trim() || null,
    slides: song.slides,
  };
}

function setlistToInsert(def: SetlistDefinition, userId: string): Record<string, unknown> {
  return {
    id: def.id,
    user_id: userId,
    legacy_client_id: null,
    name: def.name,
    description: def.description,
    items: def.items,
  };
}

export async function fetchUserLibrary(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ songs: LibrarySong[]; setlists: SetlistDefinition[] }> {
  const [songsRes, setlistsRes] = await Promise.all([
    supabase.from("songs").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("setlists").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
  ]);
  if (songsRes.error) throw songsRes.error;
  if (setlistsRes.error) throw setlistsRes.error;
  const songs = (songsRes.data as SongRow[]).map(rowToSong);
  const setlists = (setlistsRes.data as SetlistRow[]).map(rowToSetlist);
  return { songs, setlists };
}

export async function cloudUpsertSong(
  supabase: SupabaseClient,
  userId: string,
  song: LibrarySong,
): Promise<void> {
  const { error } = await supabase.from("songs").upsert(songToInsert(song, userId), { onConflict: "id" });
  if (error) throw error;
}

export async function cloudDeleteSong(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("songs").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function cloudInsertSong(
  supabase: SupabaseClient,
  userId: string,
  song: LibrarySong,
): Promise<LibrarySong> {
  const { data, error } = await supabase
    .from("songs")
    .insert(songToInsert(song, userId))
    .select("*")
    .single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function cloudUpsertSetlist(
  supabase: SupabaseClient,
  userId: string,
  def: SetlistDefinition,
): Promise<void> {
  const { error } = await supabase.from("setlists").upsert(setlistToInsert(def, userId), { onConflict: "id" });
  if (error) throw error;
}

export async function cloudDeleteSetlist(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("setlists").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function cloudInsertSetlist(
  supabase: SupabaseClient,
  userId: string,
  def: SetlistDefinition,
): Promise<SetlistDefinition> {
  const { data, error } = await supabase
    .from("setlists")
    .insert(setlistToInsert(def, userId))
    .select("*")
    .single();
  if (error) throw error;
  return rowToSetlist(data as SetlistRow);
}

export async function cloudClearLibrary(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error: ds } = await supabase.from("songs").delete().eq("user_id", userId);
  if (ds) throw ds;
  const { error: dl } = await supabase.from("setlists").delete().eq("user_id", userId);
  if (dl) throw dl;
}

export async function cloudReplaceAllLibrary(
  supabase: SupabaseClient,
  userId: string,
  songs: LibrarySong[],
  setlists: SetlistDefinition[],
): Promise<void> {
  const { error: ds } = await supabase.from("songs").delete().eq("user_id", userId);
  if (ds) throw ds;
  const { error: dl } = await supabase.from("setlists").delete().eq("user_id", userId);
  if (dl) throw dl;
  if (songs.length > 0) {
    const { error } = await supabase.from("songs").insert(songs.map((s) => songToInsert(s, userId)));
    if (error) throw error;
  }
  if (setlists.length > 0) {
    const { error } = await supabase.from("setlists").insert(setlists.map((d) => setlistToInsert(d, userId)));
    if (error) throw error;
  }
}
