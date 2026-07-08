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

const officialQuery = "(site:reelshort.com OR site:dramabox.com OR site:dramaboxdb.com OR site:netshort.com)";
const excludedQuery = "-review -recap -explained -trailer -reaction -teaser";

function absoluteUrl(value: string | undefined, base: string) {
  if (!value) return undefined;
  try { return new URL(value, base).toString(); } catch { return undefined; }
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
  const candidates = (payload.organic_results ?? []).filter((item) => item.link);
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
    discoverySource: "official_api" as const,
  }));
}
