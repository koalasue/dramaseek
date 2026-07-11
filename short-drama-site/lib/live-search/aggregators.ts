import { normalizeText } from "@/lib/search";
import type { LiveSearchResource } from "@/lib/types";

type AggregatorPlatform = {
  id: "shortdrama" | "jowo" | "minishort" | "dramaflows";
  name: string;
  baseUrl: string;
  discoveryUrls: string[];
  acceptedPath: RegExp;
};

type AnchorCandidate = {
  href: string;
  text: string;
  title?: string;
  image?: string;
  context: string;
};

type FirecrawlSearchItem = {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  metadata?: { title?: string; description?: string; ogImage?: string; sourceURL?: string };
};

const aggregatorPlatforms: AggregatorPlatform[] = [
  {
    id: "shortdrama",
    name: "ShortDrama.st",
    baseUrl: "https://shortdrama.st",
    discoveryUrls: ["https://shortdrama.st/browse?sort=views", "https://shortdrama.st/browse?sort=rating", "https://shortdrama.st/browse?sort=new"],
    acceptedPath: /^\/(?:drama|watch|series|show|browse\/drama)\//i,
  },
  {
    id: "jowo",
    name: "JOWO TV",
    baseUrl: "https://free.jowo.tv",
    discoveryUrls: ["https://free.jowo.tv/index.html"],
    acceptedPath: /^\/detail\/[^/]+\.html$/i,
  },
  {
    id: "minishort",
    name: "MiniShort",
    baseUrl: "https://minishort.com",
    discoveryUrls: ["https://minishort.com/", "https://minishort.com/drama"],
    acceptedPath: /^\/fullmovies\//i,
  },
  {
    id: "dramaflows",
    name: "DramaFlows",
    baseUrl: "https://dramaflows.com",
    discoveryUrls: ["https://dramaflows.com/", "https://dramaflows.com/hot"],
    acceptedPath: /^\/playlist\/[^/]+\/episode-\d+/i,
  },
];

const rejectedTitlePattern =
  /^(home|browse|history|cast|actresses|new|popular|surprise|get app|search|all|top|top 10|watch now|novels|dramas|categories|resources|about us|contact|terms|privacy|help center|reset|show results|more|latest short drama reviews|movie-guides|hot)$/i;

const articleTitlePattern = /\b(must-watch|top\s+\d+|best\s+short|where to watch|similar|review|guide|reviews|making waves)\b/i;
const iconTitlePattern = /^(?:icon[-\s_]*(?:play|logo|search|arrow)|logo|play)$/i;

const genreOnlyPattern = /^(actor|adventure|alpha|billionaire|ceo|fantasy|romance|werewolf|revenge|modern|sweet love|family love|true love|sports|mafia|destiny|rebirth|suspense\/thriller|情感|穿越|玄幻|都市|复仇)$/i;

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string) {
  return new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
}

async function readHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 compatible; DramaSeekPersonal/1.0",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Aggregator fetch failed: ${response.status} ${url}`);
  return response.text();
}

function extractAnchors(html: string, baseUrl: string): AnchorCandidate[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].flatMap((match) => {
    const hrefValue = attr(match[1], "href");
    if (!hrefValue || hrefValue.startsWith("#") || hrefValue.startsWith("mailto:")) return [];
    const imageMatch = /<img\b([^>]*)>/i.exec(match[2]);
    const imageSrc = imageMatch ? attr(imageMatch[1], "src") : undefined;
    const imageAlt = imageMatch ? attr(imageMatch[1], "alt") : undefined;
    let href = "";
    let image = "";
    try {
      href = new URL(decodeEntities(hrefValue), baseUrl).toString();
      image = imageSrc ? new URL(decodeEntities(imageSrc), href).toString() : "";
    } catch {
      return [];
    }
    const text = stripTags(match[2]);
    return [{
      href,
      text,
      title: imageAlt ? stripTags(imageAlt) : undefined,
      image,
      context: stripTags(match[0]).slice(0, 500),
    }];
  });
}

function cleanTitle(value: string, platformId: AggregatorPlatform["id"]) {
  let title = stripTags(value)
    .replace(/^\s*watch\s+/i, "")
    .replace(/\s*[-|]\s*(MiniShort|DramaFlows|ShortDrama\.st|JOWO TV).*$/i, "")
    .replace(/^\s*★?\s*\d(?:\.\d)?\s*/i, "")
    .replace(/^\s*\d+\s*(?:eps?|episodes?|ep)\s*/i, "")
    .replace(/\s+epsiode\s+\d+\s+for\s+free$/i, "")
    .replace(/\s+episode\s+\d+\s+for\s+free$/i, "")
    .replace(/\s+episode\s+\d+\s+online\s+free$/i, "")
    .replace(/\s+online\s+free$/i, "")
    .replace(/\s+for\s+free$/i, "")
    .replace(/\s*-\s*episode\s+\d+\s*-\s*dramaflows$/i, "")
    .replace(/\s*\d+\s*(?:eps?|episodes?)\s*$/i, "")
    .replace(/\s*cover$/i, "")
    .replace(/\s*latest$/i, "")
    .replace(/\s*watch now$/i, "")
    .replace(/\s*\/\s*episode\s+\d+$/i, "")
    .replace(/\s*-\s*episode\s+\d+$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (platformId === "dramaflows") {
    title = title.replace(/^(hot|new)\s+/i, "").replace(/\s+\d+\s*episodes?\s+\d(?:\.\d)?$/i, "").trim();
  }

  const half = Math.floor(title.length / 2);
  if (title.length > 8 && title.length % 2 === 0 && title.slice(0, half).trim() === title.slice(half).trim()) {
    title = title.slice(0, half).trim();
  }
  return title;
}

function titleFromPath(pathname: string, platformId: AggregatorPlatform["id"]) {
  const match = platformId === "dramaflows"
    ? pathname.match(/^\/playlist\/([^/]+)\/episode-\d+/i)?.[1]
    : platformId === "minishort"
      ? pathname.match(/^\/fullmovies\/([^/]+)/i)?.[1]?.replace(/-dzdrama$/i, "")
      : pathname.split("/").filter(Boolean).at(-1);
  if (!match) return "";
  return match.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

function episodeCountFrom(value: string) {
  const parsed = Number(/\b(\d{1,3})\s*(?:eps?|episodes?)\b/i.exec(value)?.[1]);
  return Number.isFinite(parsed) && parsed >= 2 && parsed <= 300 ? parsed : undefined;
}

function looksLikeDramaTitle(title: string) {
  if (title.length < 3 || title.length > 96) return false;
  if (rejectedTitlePattern.test(title) || genreOnlyPattern.test(title) || articleTitlePattern.test(title)) return false;
  if (/^\d+(?:\.\d+)?$/.test(title)) return false;
  return /[\p{L}\p{Script=Han}]/u.test(title);
}

function candidateToResource(platform: AggregatorPlatform, candidate: AnchorCandidate, index: number): LiveSearchResource | null {
  let url: URL;
  try { url = new URL(candidate.href); } catch { return null; }
  if (!platform.acceptedPath.test(url.pathname)) return null;

  const rawTitle = cleanTitle(candidate.title || candidate.text, platform.id);
  const title = looksLikeDramaTitle(rawTitle) && !iconTitlePattern.test(rawTitle) ? rawTitle : titleFromPath(url.pathname, platform.id);
  if (!looksLikeDramaTitle(title)) return null;
  const context = `${candidate.text} ${candidate.title ?? ""} ${candidate.context}`;
  const episodes = episodeCountFrom(context) ?? episodeCountFrom(url.pathname);

  return {
    id: `aggregator:${platform.id}:${encodeURIComponent(url.pathname)}`,
    platformId: platform.id,
    title,
    url: url.toString(),
    thumbnailUrl: candidate.image ?? "",
    uploader: platform.name,
    contentType: episodes && episodes > 1 ? "full_series" : "episode",
    play_type: "external",
    status: "available",
    quality_score: 84,
    verifiedOfficial: false,
    discoverySource: "public_aggregator",
    source_type: "public_aggregator",
    official_source: false,
    source_url: url.toString(),
    confidence_score: 80,
    hot_score: Math.max(45, 90 - index),
    trend_direction: index < 8 ? "UP" : "STABLE",
    episodeCount: episodes,
    officialRank: index + 1,
    description: `公开免费聚合资源站 ${platform.name} 的可观看短剧入口。`,
    discoveredAt: new Date().toISOString(),
  };
}

function searchItemToResource(platform: AggregatorPlatform, item: FirecrawlSearchItem, index: number): LiveSearchResource | null {
  const href = item.url ?? item.metadata?.sourceURL ?? "";
  const title = item.title ?? item.metadata?.title ?? "";
  const description = item.description ?? item.metadata?.description ?? "";
  const image = item.image ?? item.metadata?.ogImage ?? "";
  return candidateToResource(platform, { href, text: title, title, image, context: `${title} ${description}` }, index);
}

function dedupe(resources: LiveSearchResource[]) {
  const seen = new Map<string, LiveSearchResource>();
  for (const resource of resources) {
    const key = `${resource.platformId}:${normalizeText(resource.title)}`;
    const existing = seen.get(key);
    if (!existing || (resource.episodeCount ?? 0) > (existing.episodeCount ?? 0) || resource.thumbnailUrl && !existing.thumbnailUrl) {
      seen.set(key, resource);
    }
  }
  return [...seen.values()];
}

export function filterAggregatorHtml(html: string, platformId: AggregatorPlatform["id"], pageUrl?: string) {
  const platform = aggregatorPlatforms.find((item) => item.id === platformId);
  if (!platform) return [];
  const anchors = extractAnchors(html, pageUrl ?? platform.baseUrl);
  return dedupe(anchors.flatMap((candidate, index) => candidateToResource(platform, candidate, index) ?? [])).slice(0, 24);
}

export async function discoverAggregatorDramas(): Promise<LiveSearchResource[]> {
  const settled = await Promise.allSettled([
    ...aggregatorPlatforms.map(discoverAggregatorPlatformDirect),
    discoverAggregatorsWithFirecrawl(),
  ]);
  return dedupe(settled.flatMap((item) => item.status === "fulfilled" ? item.value : []));
}

async function discoverAggregatorPlatformDirect(platform: AggregatorPlatform) {
  const resources: LiveSearchResource[] = [];
  for (const url of platform.discoveryUrls) {
    try {
      resources.push(...filterAggregatorHtml(await readHtml(url), platform.id, url));
    } catch {
      // Public aggregators occasionally rate-limit or reset one page; keep the rest.
    }
  }
  return resources;
}

export async function searchAggregatorDramas(query: string): Promise<LiveSearchResource[]> {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];
  const [discovered, firecrawl] = await Promise.allSettled([discoverAggregatorDramas(), searchAggregatorsWithFirecrawl(query)]);
  return dedupe([
    ...(discovered.status === "fulfilled" ? discovered.value.filter((resource) => normalizeText(resource.title).includes(normalizedQuery)) : []),
    ...(firecrawl.status === "fulfilled" ? firecrawl.value : []),
  ]).slice(0, 20);
}

export const aggregatorPlatformIds = aggregatorPlatforms.map((platform) => platform.id);

function firecrawlSearchItems(payload: unknown): FirecrawlSearchItem[] {
  const value = payload as { data?: FirecrawlSearchItem[] | { web?: FirecrawlSearchItem[] } };
  if (Array.isArray(value.data)) return value.data;
  return value.data?.web ?? [];
}

async function firecrawlSearch(query: string, limit = 10) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];
  const response = await fetch(`${process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev"}/v2/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Firecrawl aggregator search failed: ${response.status}`);
  return firecrawlSearchItems(await response.json());
}

async function discoverAggregatorsWithFirecrawl(): Promise<LiveSearchResource[]> {
  const queries: Array<[AggregatorPlatform["id"], string]> = [
    ["shortdrama", "site:shortdrama.st/drama short drama eps"],
    ["jowo", "site:free.jowo.tv/detail 短剧"],
    ["minishort", "site:minishort.com/fullmovies short drama"],
    ["dramaflows", "site:dramaflows.com/playlist episode short drama"],
  ];
  const settled = await Promise.allSettled(queries.map(async ([platformId, query]) => {
    const platform = aggregatorPlatforms.find((item) => item.id === platformId);
    if (!platform) return [];
    return (await firecrawlSearch(query, 12)).flatMap((item, index) => searchItemToResource(platform, item, index) ?? []);
  }));
  return dedupe(settled.flatMap((item) => item.status === "fulfilled" ? item.value : []));
}

async function searchAggregatorsWithFirecrawl(query: string): Promise<LiveSearchResource[]> {
  const settled = await Promise.allSettled(aggregatorPlatforms.map(async (platform) => {
    const site = new URL(platform.baseUrl).hostname;
    return (await firecrawlSearch(`"${query}" site:${site}`, 8)).flatMap((item, index) => searchItemToResource(platform, item, index) ?? []);
  }));
  return dedupe(settled.flatMap((item) => item.status === "fulfilled" ? item.value : []));
}
