import { filterFirecrawlResults } from "@/lib/live-search/firecrawl";
import type { LiveSearchResource } from "@/lib/types";

type SerpApiOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  thumbnail?: string;
  source?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[];
};

type HtmlMetadata = {
  title?: string;
  description?: string;
  image?: string;
};

const officialQuery = "(site:reelshort.com OR site:dramabox.com OR site:dramaboxdb.com OR site:netshort.com OR site:shortmax.app OR site:shortmax.tv OR site:goodshort.com OR site:flextv.cc OR site:flextv.co)";
const excludedQuery = "-review -recap -explained -trailer -reaction -teaser -clip -\"watch free\" -\"full movie\" -movie -\"youtube compilation\"";
const platformDomains: Record<string, { name: string; sites: string[] }> = {
  reelshort: { name: "ReelShort", sites: ["reelshort.com"] },
  dramabox: { name: "DramaBox", sites: ["dramabox.com", "dramaboxdb.com"] },
  netshort: { name: "NetShort", sites: ["netshort.com"] },
  shortmax: { name: "ShortMax", sites: ["shortmax.app", "shortmax.tv"] },
  goodshort: { name: "GoodShort", sites: ["goodshort.com"] },
  flextv: { name: "FlexTV", sites: ["flextv.cc", "flextv.co"] },
};
const rejectedDiscoveryContent =
  /\b(review|recap|explained|reaction|trailer|teaser|commentary|preview|clip|watch\s+free|full\s+movie|movie|movies|tv\s+shows?|streaming|tubi|episode\s+only|youtube\s+compilation)\b|解说|讲解|影评|预告|花絮|混剪|二创/i;

function absoluteUrl(value: string | undefined, base: string) {
  if (!value) return undefined;
  try { return new URL(value, base).toString(); } catch { return undefined; }
}

export function isOfficialPlatformUrl(rawUrl: string, platformId: keyof typeof platformDomains) {
  const platform = platformDomains[platformId];
  if (!platform) return false;
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return platform.sites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
  } catch {
    return false;
  }
}

export function isSupportedOfficialUrl(rawUrl: string) {
  return Object.keys(platformDomains).some((platformId) => isOfficialPlatformUrl(rawUrl, platformId));
}

function meta(content: string, key: string) {
  const property = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i").exec(content)?.[1];
  if (property) return property;
  return new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, "i").exec(content)?.[1];
}

async function readHtmlMetadata(url: string): Promise<HtmlMetadata> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 compatible; DramaSeekBot/1.0; +https://dramaseek.vercel.app" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return {};
    const html = (await response.text()).slice(0, 250_000);
    const jsonLdImage = html.match(/"image"\s*:\s*"([^"]+)"/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    return {
      title: meta(html, "og:title") ?? titleTag,
      description: meta(html, "og:description") ?? meta(html, "description"),
      image: absoluteUrl(meta(html, "og:image") ?? meta(html, "twitter:image") ?? jsonLdImage, url),
    };
  } catch {
    return {};
  }
}

export async function searchOfficialPagesWithSerpApi(query: string): Promise<LiveSearchResource[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey || !query.trim()) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `"${query}" ${officialQuery} ${excludedQuery}`);
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`SerpAPI search failed: ${response.status}`);
  const payload = await response.json() as SerpApiResponse;
  const candidates = (payload.organic_results ?? []).filter((item) => item.link && isSupportedOfficialUrl(item.link));
  const enriched = await Promise.all(candidates.map(async (item) => {
    const page = await readHtmlMetadata(item.link!);
    return {
      url: item.link,
      title: page.title ?? item.title,
      description: page.description ?? item.snippet,
      image: page.image,
      metadata: {
        sourceURL: item.link,
        title: page.title ?? item.title,
        description: page.description ?? item.snippet,
        ogImage: page.image,
      },
    };
  }));

  return filterFirecrawlResults(enriched, query).map((resource) => ({
    ...resource,
    id: resource.id.replace(/^firecrawl:/, "serpapi:"),
    discoverySource: "serpapi" as const,
    source_type: "official_platform" as const,
    official_source: true,
    source_url: resource.url,
  }));
}

export async function discoverOfficialPlatformPages(platformId: "reelshort" | "dramabox" | "netshort" | "shortmax" | "goodshort" | "flextv"): Promise<LiveSearchResource[]> {
  const apiKey = process.env.SERPAPI_KEY;
  const platform = platformDomains[platformId];
  if (!apiKey || !platform) return [];

  const url = new URL("https://serpapi.com/search.json");
  const siteQuery = platform.sites.map((site) => `site:${site}`).join(" OR ");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `(${siteQuery}) ("full episodes" OR "watch" OR "short drama" OR "drama") ${excludedQuery}`);
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`SerpAPI discovery failed: ${response.status}`);
  const payload = await response.json() as SerpApiResponse;
  const candidates = (payload.organic_results ?? []).filter((item) => item.link && isOfficialPlatformUrl(item.link, platformId));
  const enriched = await Promise.all(candidates.map(async (item) => {
    const page = await readHtmlMetadata(item.link!);
    return { item, page };
  }));

  const seen = new Set<string>();
  return enriched.flatMap(({ item, page }) => {
    const link = item.link!;
    if (!isOfficialPlatformUrl(link, platformId)) return [];
    const title = (page.title ?? item.title ?? "").replace(/\s*[-|]\s*(ReelShort|DramaBox|NetShort).*$/i, "").trim();
    const description = page.description ?? item.snippet ?? "";
    if (!page.image || !title) return [];
    if (rejectedDiscoveryContent.test(`${title} ${description}`)) return [];
    try {
      const parsed = new URL(link);
      if (seen.has(parsed.pathname)) return [];
      seen.add(parsed.pathname);
    } catch {
      return [];
    }
    const fullSeries = /full|complete|all episodes|全集|完整版|全剧|full-episodes/i.test(`${link} ${title} ${description}`);
    return [{
      id: `serpapi:discover:${platformId}:${encodeURIComponent(link)}`,
      platformId,
      title,
      url: link,
      thumbnailUrl: page.image,
      uploader: `${platform.name} 官方站`,
      contentType: fullSeries ? "full_series" : "episode",
      verifiedOfficial: true,
      discoverySource: "serpapi",
      source_type: "official_platform",
      official_source: true,
      source_url: link,
      officialRank: seen.size,
      description: description.trim() || undefined,
    } satisfies LiveSearchResource];
  }).slice(0, 8);
}
