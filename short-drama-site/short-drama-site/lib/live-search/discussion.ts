import { normalizeText } from "@/lib/search";

type FirecrawlItem = { url?: string; title?: string; description?: string; image?: string; metadata?: { sourceURL?: string; title?: string; description?: string; ogImage?: string } };
export interface DiscussionSignal { dramaId: string; platformId: "youtube" | "tiktok"; mentions: number; creatorCount: number; thumbnailUrl?: string; sampleUrl?: string }

function youtubeThumbnail(url: string) {
  try { const parsed = new URL(url); const id = parsed.searchParams.get("v") ?? parsed.pathname.match(/\/shorts\/([^/?]+)/)?.[1]; return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined; } catch { return undefined; }
}

export async function searchDiscussionSignals(dramas: Array<{ id: string; titleEn: string; titleZh: string; aliases: string[] }>, platformId: "youtube" | "tiktok"): Promise<DiscussionSignal[]> {
  if (!process.env.FIRECRAWL_API_KEY || !dramas.length) return [];
  const domain = platformId === "youtube" ? "youtube.com" : "tiktok.com";
  const titleQuery = dramas.map((drama) => `\"${drama.titleEn || drama.titleZh}\"`).join(" OR ");
  const response = await fetch(`${process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev"}/v2/search`, { method: "POST", headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: `(${titleQuery}) site:${domain} (review OR reaction OR edit OR recap OR short drama)`, limit: 50 }), signal: AbortSignal.timeout(25000) });
  if (!response.ok) return [];
  const payload = await response.json() as { data?: { web?: FirecrawlItem[] } | FirecrawlItem[] };
  const items = Array.isArray(payload.data) ? payload.data : payload.data?.web ?? [];
  return dramas.map((drama) => {
    const names = [drama.titleEn, drama.titleZh, ...drama.aliases].map(normalizeText).filter((name) => name.length >= 5);
    const matches = items.filter((item) => { const text = normalizeText(`${item.title ?? item.metadata?.title ?? ""} ${item.description ?? item.metadata?.description ?? ""}`); return names.some((name) => text.includes(name)); });
    const creators = new Set(matches.map((item) => { try { const url = new URL(item.url ?? item.metadata?.sourceURL ?? ""); return url.pathname.split("/").filter(Boolean)[0] ?? url.hostname; } catch { return ""; } }).filter(Boolean));
    const first = matches[0], sampleUrl = first?.url ?? first?.metadata?.sourceURL;
    return { dramaId: drama.id, platformId, mentions: matches.length, creatorCount: creators.size, thumbnailUrl: first?.image ?? first?.metadata?.ogImage ?? (sampleUrl && platformId === "youtube" ? youtubeThumbnail(sampleUrl) : undefined), sampleUrl };
  }).filter((signal) => signal.mentions > 0);
}
