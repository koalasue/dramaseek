import { dramas as fallbackDramas, platforms as fallbackPlatforms, demoSubmissions } from "@/lib/seed";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { CloudSource, CloudType, Drama, PersonalAccountConnection, PersonalAccountConnectionMode, PersonalAccountPlatform, Platform, Submission, SubmissionInput } from "@/lib/types";

type DramaRow = {
  id: string; slug: string; title_zh: string; title_en: string; synopsis: string; poster_url: string;
  title?: string | null; original_title?: string | null; description?: string | null; cover?: string | null; genre?: string[] | null;
  episode_count: number | null; episodes?: number | null; country?: string | null; language?: Drama["languages"][number] | null;
  languages: Drama["languages"]; regions: string[]; trending_score: number; updated_at: string;
  drama_aliases?: { value: string }[];
  resources?: { id: string; platform_id: string; platform?: string | null; url: string; video_id?: string | null; play_type?: Drama["resources"][number]["playType"] | null; playback_status?: Drama["resources"][number]["playbackStatus"] | null; quality_score?: number | null; last_check_time?: string | null; language: Drama["languages"][number]; region: string; status: "active" | "limited" | "unavailable"; official: boolean; published_at: string | null; checked_at: string; source_proof: string; content_type: "full_series" | "episode" | null }[];
};

type CloudSourceRow = {
  id: string;
  drama_id?: string | null;
  title?: string | null;
  cloud_type: CloudType;
  cloud_url: string;
  cloud_status: CloudSource["cloudStatus"];
  subtitle_support_score: number;
  note?: string | null;
  created_time: string;
  updated_time?: string | null;
};

function mapCloudSource(row: CloudSourceRow): CloudSource {
  return {
    id: row.id,
    dramaId: row.drama_id ?? undefined,
    title: row.title ?? undefined,
    cloudType: row.cloud_type,
    cloudUrl: row.cloud_url,
    cloudStatus: row.cloud_status,
    subtitleSupportScore: row.subtitle_support_score,
    note: row.note ?? undefined,
    createdTime: row.created_time,
    updatedTime: row.updated_time ?? undefined,
  };
}

function mapDrama(row: DramaRow): Drama {
  return {
    id: row.id, slug: row.slug, titleZh: row.title_zh, titleEn: row.title_en, title: row.title ?? row.title_en,
    originalTitle: row.original_title ?? row.title_en, synopsis: row.synopsis, description: row.description ?? row.synopsis,
    posterUrl: row.poster_url, cover: row.cover ?? row.poster_url, genre: row.genre ?? [], episodeCount: row.episode_count ?? row.episodes ?? undefined,
    episodes: row.episodes ?? row.episode_count ?? undefined, country: row.country ?? "Global", language: row.language ?? row.languages[0] ?? "en", languages: row.languages,
    regions: row.regions, trendingScore: row.trending_score, updatedAt: row.updated_at,
    aliases: row.drama_aliases?.map((item) => item.value) ?? [],
    resources: (row.resources ?? []).map((item) => ({
      id: item.id, resourceId: item.id, dramaId: row.id, platformId: item.platform_id, platform: item.platform ?? item.platform_id, url: item.url, videoId: item.video_id ?? undefined, playType: item.play_type ?? undefined, playbackStatus: item.playback_status ?? undefined, qualityScore: item.quality_score ?? undefined, lastCheckTime: item.last_check_time ?? undefined, language: item.language, region: item.region,
      status: item.status, official: item.official, publishedAt: item.published_at ?? undefined,
      checkedAt: item.checked_at, sourceProof: item.source_proof, contentType: item.content_type ?? undefined
    })),
    cloudSources: []
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
  const dramas = (data as DramaRow[]).map(mapDrama).map((drama) => ({ ...drama, resources: drama.resources.filter((resource) => resource.status !== "unavailable" && resource.official) }));
  const { data: cloudRows } = await supabase
    .from("cloud_sources")
    .select("*")
    .eq("approved", true)
    .in("cloud_status", ["available", "processing"])
    .order("created_time", { ascending: false });
  if (!cloudRows?.length) return dramas;
  const byDrama = new Map<string, CloudSource[]>();
  (cloudRows as CloudSourceRow[]).forEach((row) => {
    if (!row.drama_id) return;
    const list = byDrama.get(row.drama_id) ?? [];
    list.push(mapCloudSource(row));
    byDrama.set(row.drama_id, list);
  });
  return dramas.map((drama) => ({ ...drama, cloudSources: byDrama.get(drama.id) ?? [] }));
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

const personalPlatformNames: Record<PersonalAccountPlatform, string> = {
  reelshort: "ReelShort",
  dramabox: "DramaBox",
  shortmax: "ShortMax",
  goodshort: "GoodShort",
  flextv: "FlexTV",
  netshort: "NetShort",
  tiktok: "TikTok",
};

type PersonalAccountRow = {
  id: string;
  platform_id: PersonalAccountPlatform;
  mode: PersonalAccountConnectionMode;
  account_label?: string | null;
  status: PersonalAccountConnection["status"];
  last_sync_time?: string | null;
  synced_drama_count: number;
  failed_count: number;
  login_required_count: number;
  private_count: number;
  note?: string | null;
  created_at: string;
  updated_at: string;
};

function mapPersonalAccount(row: PersonalAccountRow): PersonalAccountConnection {
  return {
    id: row.id,
    platformId: row.platform_id,
    platformName: personalPlatformNames[row.platform_id] ?? row.platform_id,
    mode: row.mode,
    accountLabel: row.account_label ?? undefined,
    status: row.status,
    lastSyncTime: row.last_sync_time ?? undefined,
    syncedDramaCount: row.synced_drama_count,
    failedCount: row.failed_count,
    loginRequiredCount: row.login_required_count,
    privateCount: row.private_count,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPersonalAccountConnections(): Promise<PersonalAccountConnection[]> {
  const supabase = getSupabaseServer();
  const now = new Date().toISOString();
  if (!supabase) {
    return (Object.keys(personalPlatformNames) as PersonalAccountPlatform[]).map((platformId) => ({
      id: `demo:${platformId}`,
      platformId,
      platformName: personalPlatformNames[platformId],
      mode: "manual",
      status: "not_connected",
      syncedDramaCount: 0,
      failedCount: 0,
      loginRequiredCount: 0,
      privateCount: 0,
      note: "演示模式：连接记录只用于个人同步规划，不会公开账号内容。",
      createdAt: now,
      updatedAt: now,
    }));
  }
  const { data, error } = await supabase.from("personal_account_connections").select("*").order("updated_at", { ascending: false });
  if (error) return [];
  return (data as PersonalAccountRow[]).map(mapPersonalAccount);
}

export async function upsertPersonalAccountConnection(input: { platformId: PersonalAccountPlatform; mode: PersonalAccountConnectionMode; accountLabel?: string; note?: string }) {
  const supabase = getSupabaseServer();
  const now = new Date().toISOString();
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      platformId: input.platformId,
      platformName: personalPlatformNames[input.platformId],
      mode: input.mode,
      accountLabel: input.accountLabel,
      status: "connected",
      syncedDramaCount: 0,
      failedCount: 0,
      loginRequiredCount: 0,
      privateCount: 0,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    } satisfies PersonalAccountConnection;
  }
  const { data, error } = await supabase.from("personal_account_connections").upsert({
    platform_id: input.platformId,
    mode: input.mode,
    account_label: input.accountLabel,
    note: input.note,
    status: input.mode === "manual" ? "needs_action" : "connected",
    updated_at: now,
  }, { onConflict: "platform_id" }).select().single();
  if (error) throw new Error(error.message);
  return mapPersonalAccount(data as PersonalAccountRow);
}

export async function markPersonalAccountSynced(id: string) {
  const supabase = getSupabaseServer();
  const now = new Date().toISOString();
  if (!supabase) return { ok: true, demo: true };
  const { error } = await supabase.from("personal_account_connections").update({
    last_sync_time: now,
    updated_at: now,
    status: "connected",
  }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
