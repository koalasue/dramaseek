import { normalizeText } from "@/lib/search";
import type { LiveSearchResource } from "@/lib/types";

type FirecrawlSearchItem = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
  image?: string;
  metadata?: { title?: string; description?: string; ogImage?: string; sourceURL?: string };
};

type FirecrawlPayload = {
  success?: boolean;
  data?: { web?: FirecrawlSearchItem[] } | FirecrawlSearchItem[];
};

const supportedPlatforms = [
  { id: "reelshort", name: "ReelShort", domains: ["reelshort.com", "www.reelshort.com"] },
  { id: "dramabox", name: "DramaBox", domains: ["dramabox.com", "www.dramabox.com"] },
  { id: "netshort", name: "NetShort", domains: ["netshort.com", "www.netshort.com"] },
  { id: "shortmax", name: "ShortMax", domains: ["shortmax.app", "www.shortmax.app", "shortmax.tv", "www.shortmax.tv"] },
  { id: "goodshort", name: "GoodShort", domains: ["goodshort.com", "www.goodshort.com"] },
  { id: "flextv", name: "FlexTV", domains: ["flextv.cc", "www.flextv.cc", "flextv.co", "www.flextv.co"] },
] as const;

const rejectedContent = /\b(review|recap|explained|explanation|reaction|trailer|teaser|commentary|preview|clip|episode\s+only|youtube\s+compilation)\b|解说|讲解|盘点|吐槽|影评|预告|花絮|混剪|二创/i;
const genericPages = /\/(?:search|privacy|terms|about|contact|download)(?:\/|$)/i;

function platformForUrl(rawUrl: string) {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return supportedPlatforms.find((platform) => platform.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)));
  } catch {
    return undefined;
  }
}

function titleMatches(title: string, query: string) {
  const normalizedTitle = normalizeText(title);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery || !normalizedTitle.includes(normalizedQuery)) return false;
  const remainder = normalizedTitle.replace(normalizedQuery, "");
  return !remainder || /^(?:watch|online|full|episodes?|series|movie|reelshort|dramabox|netshort|短剧|全集|完整版)+$/.test(remainder);
}

function looksLikeDramaPage(pathname: string, evidence: string) {
  return /\/(?:drama|movie|series|show|video|play|episode|full-episodes?)\//i.test(pathname) ||
    /\b(drama|episodes?|full|series|romance|ceo|billionaire|mafia|werewolf|alpha|marriage)\b/i.test(evidence);
}

export function filterFirecrawlResults(items: FirecrawlSearchItem[], query: string, options: { broad?: boolean } = {}): LiveSearchResource[] {
  const seen = new Set<string>();

  return items.flatMap((item) => {
    const url = item.url ?? item.metadata?.sourceURL ?? "";
    const platform = platformForUrl(url);
    const title = (item.title ?? item.metadata?.title ?? "").trim();
    const description = item.description ?? item.metadata?.description ?? "";
    const evidence = `${title} ${description} ${item.markdown?.slice(0, 1200) ?? ""}`;
    let pathname = "";
    try { pathname = new URL(url).pathname; } catch { return []; }
    if (!platform || rejectedContent.test(evidence) || genericPages.test(pathname)) return [];
    if (options.broad) {
      if (!looksLikeDramaPage(pathname, evidence)) return [];
    } else if (!titleMatches(title, query)) return [];

    const key = `${platform.id}:${pathname.replace(/\/$/, "")}`;
    if (seen.has(key)) return [];
    seen.add(key);

    const fullSeries = /full|complete|all episodes|全集|完整版|全剧|episodes/i.test(evidence);
    return [{
      id: `firecrawl:${platform.id}:${encodeURIComponent(pathname)}`,
      platformId: platform.id,
      title,
      url,
      thumbnailUrl: item.image ?? item.metadata?.ogImage ?? "",
      uploader: `${platform.name} 官方站`,
      contentType: fullSeries ? "full_series" as const : "episode" as const,
      verifiedOfficial: true,
      discoverySource: "firecrawl" as const,
      source_type: "official_platform" as const,
      official_source: true,
      source_url: url,
      description: description.trim() || undefined,
    }];
  }).slice(0, 18);
}

function getSearchItems(payload: FirecrawlPayload): FirecrawlSearchItem[] {
  if (Array.isArray(payload.data)) return payload.data;
  return payload.data?.web ?? [];
}

export async function searchWithFirecrawl(query: string): Promise<LiveSearchResource[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`${process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev"}/v2/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `\"${query}\" (site:reelshort.com OR site:dramabox.com OR site:netshort.com OR site:shortmax.app OR site:shortmax.tv OR site:goodshort.com OR site:flextv.cc OR site:flextv.co) -review -recap -explained -trailer -reaction -clip`,
      limit: 18,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) throw new Error(`Firecrawl search failed: ${response.status}`);
  return filterFirecrawlResults(getSearchItems(await response.json() as FirecrawlPayload), query);
}

export async function discoverWithFirecrawl(): Promise<LiveSearchResource[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const queries = [
    "site:reelshort.com short drama trending full episodes -review -recap -trailer",
    "site:dramabox.com short drama popular full episodes -review -recap -trailer",
    "site:netshort.com short drama popular watch -review -recap -trailer",
    "(site:shortmax.app OR site:shortmax.tv) short drama popular watch -review -recap -trailer",
    "site:goodshort.com short drama popular watch -review -recap -trailer",
    "(site:flextv.cc OR site:flextv.co) short drama popular watch -review -recap -trailer",
  ];

  const settled = await Promise.allSettled(queries.map(async (query) => {
    const response = await fetch(`${process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev"}/v2/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`Firecrawl discovery failed: ${response.status}`);
    return filterFirecrawlResults(getSearchItems(await response.json() as FirecrawlPayload), "", { broad: true });
  }));

  const seen = new Set<string>();
  return settled.flatMap((item) => item.status === "fulfilled" ? item.value : []).filter((resource) => {
    const key = `${resource.platformId}:${resource.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const firecrawlPlatformIds = supportedPlatforms.map((platform) => platform.id);
