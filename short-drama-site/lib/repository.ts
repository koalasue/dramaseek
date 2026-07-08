import { dramas as fallbackDramas, platforms as fallbackPlatforms, demoSubmissions } from "@/lib/seed";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Drama, Platform, Submission, SubmissionInput } from "@/lib/types";

type DramaRow = {
  id: string; slug: string; title_zh: string; title_en: string; synopsis: string; poster_url: string;
  episode_count: number | null; languages: Drama["languages"]; regions: string[]; trending_score: number; updated_at: string;
  drama_aliases?: { value: string }[];
  resources?: { id: string; platform_id: string; url: string; language: Drama["languages"][number]; region: string; status: "active" | "limited" | "unavailable"; official: boolean; published_at: string | null; checked_at: string; source_proof: string; content_type: "full_series" | "episode" | null }[];
};

function mapDrama(row: DramaRow): Drama {
  return {
    id: row.id, slug: row.slug, titleZh: row.title_zh, titleEn: row.title_en, synopsis: row.synopsis,
    posterUrl: row.poster_url, episodeCount: row.episode_count ?? undefined, languages: row.languages,
    regions: row.regions, trendingScore: row.trending_score, updatedAt: row.updated_at,
    aliases: row.drama_aliases?.map((item) => item.value) ?? [],
    resources: (row.resources ?? []).map((item) => ({
      id: item.id, platformId: item.platform_id, url: item.url, language: item.language, region: item.region,
      status: item.status, official: item.official, publishedAt: item.published_at ?? undefined,
      checkedAt: item.checked_at, sourceProof: item.source_proof, contentType: item.content_type ?? undefined
    }))
  };
}

export async function listPlatforms(): Promise<Platform[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return fallbackPlatforms;
  const { data, error } = await supabase.from("platforms").select("*").order("name");
  if (error || !data?.length) return fallbackPlatforms;
  return data.map((row) => ({ id: row.id, slug: row.slug, name: row.name, domain: row.domain, color: row.color, offlineNote: row.offline_note }));
}

export async function listDramas(): Promise<Drama[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return fallbackDramas;
  const { data, error } = await supabase.from("dramas").select("*, drama_aliases(value), resources(*)").eq("published", true);
  if (error || !data?.length) return fallbackDramas;
  return (data as DramaRow[]).map(mapDrama).map((drama) => ({ ...drama, resources: drama.resources.filter((resource) => resource.status !== "unavailable" && resource.official) }));
}

export async function getDramaBySlug(slug: string) {
  return (await listDramas()).find((item) => item.slug === slug) ?? null;
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const supabase = getSupabaseServer();
  const fallback: Submission = { id: crypto.randomUUID(), ...input, status: "pending", createdAt: new Date().toISOString() };
  if (!supabase) return fallback;
  const { data, error } = await supabase.from("submissions").insert({ url: input.url, title: input.title, note: input.note, contact: input.contact }).select().single();
  if (error) throw new Error(error.message);
  return { id: data.id, url: data.url, title: data.title, note: data.note, contact: data.contact, status: data.status, createdAt: data.created_at };
}

export async function listSubmissions(): Promise<Submission[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return demoSubmissions;
  const { data, error } = await supabase.from("submissions").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((row) => ({ id: row.id, url: row.url, title: row.title, note: row.note, contact: row.contact, status: row.status, createdAt: row.created_at }));
}
