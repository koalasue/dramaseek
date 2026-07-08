import { NextRequest, NextResponse } from "next/server";
import { validateAuthorizedMediaUrl } from "@/lib/download-policy";
import { validateResourceUrl } from "@/lib/url-policy";

type Episode = { id: string; label: string; url: string; downloadable: boolean };

function episodeNumber(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.endsWith("netshort.com") && url.pathname.startsWith("/episode/") && !/-ep-\d+\/?$/i.test(url.pathname)) return 1;
    const query = url.searchParams.get("episode") ?? url.searchParams.get("ep");
    const path = url.pathname.match(/(?:episode|ep)[-_\/]?(\d+)/i)?.[1] ?? url.pathname.match(/\/(\d+)\/?$/)?.[1];
    return Number(query ?? path) || undefined;
  } catch { return undefined; }
}

function normalizeEpisodes(urls: string[], currentUrl: string): Episode[] {
  const seen = new Set<string>();
  const values = urls.filter((url) => validateResourceUrl(url).valid).map((url) => ({ url, number: episodeNumber(url) })).filter((item) => item.number != null).sort((a, b) => a.number! - b.number!);
  const episodes = values.filter((item) => { const key = `${new URL(item.url).origin}:${item.number}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 100).map((item) => ({ id: `episode-${item.number}`, label: `第 ${item.number} 集`, url: item.url, downloadable: validateAuthorizedMediaUrl(item.url).allowed }));
  return episodes.length ? episodes : [{ id: "current", label: "当前资源 / 全集", url: currentUrl, downloadable: validateAuthorizedMediaUrl(currentUrl).allowed }];
}

function netShortEpisodeUrls(currentUrl: string, markdown: string) {
  try {
    const url = new URL(currentUrl);
    if (!url.hostname.endsWith("netshort.com") || !url.pathname.startsWith("/full-episodes/")) return [];
    const slug = url.pathname.replace("/full-episodes/", "").replace(/\/$/, "");
    const count = Number(markdown.match(/Full episodes\s+(\d+)\s+Episodes/i)?.[1] ?? markdown.match(/\d+\s*-\s*(\d+)/g)?.at(-1)?.match(/(\d+)$/)?.[1]);
    if (!count || count > 300) return [];
    return Array.from({ length: count }, (_, index) => index === 0 ? `${url.origin}/episode/${slug}` : `${url.origin}/episode/${slug}-ep-${index + 1}`);
  } catch { return []; }
}

async function netShortStructuredEpisodes(currentUrl: string) {
  try {
    const url = new URL(currentUrl);
    if (!url.hostname.endsWith("netshort.com") || !url.pathname.startsWith("/full-episodes/")) return [];
    const response = await fetch(currentUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ShortDramaIndex/1.0)" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const html = await response.text();
    const discovered = [...new Set(html.match(/https:\/\/netshort\.com\/episode\/[^"\\<]+/g) ?? [])];
    const count = Number(html.match(/"numberOfEpisodes":(\d+)/)?.[1]);
    const slug = url.pathname.replace("/full-episodes/", "").replace(/\/$/, "");
    return count > discovered.length && count <= 300 ? Array.from({ length: count }, (_, index) => index === 0 ? `${url.origin}/episode/${slug}` : `${url.origin}/episode/${slug}-ep-${index + 1}`) : discovered;
  } catch { return []; }
}

async function dailymotionAvailable(url: string) {
  const id = new URL(url).pathname.match(/\/video\/([^_/?]+)/)?.[1];
  if (!id) return true;
  const response = await fetch(`https://api.dailymotion.com/video/${id}?fields=id,status,allow_embed,private`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) return false;
  const video = await response.json() as { status?: string; allow_embed?: boolean; private?: boolean };
  return video.status !== "deleted" && video.allow_embed !== false && video.private !== true;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") ?? "";
  if (!validateResourceUrl(rawUrl).valid) return NextResponse.json({ error: "不支持的资源地址" }, { status: 400 });
  try {
    if (new URL(rawUrl).hostname.endsWith("dailymotion.com") && !await dailymotionAvailable(rawUrl)) return NextResponse.json({ episodes: [], unavailable: true, reason: "该视频已删除、设为私密或禁止嵌入" });
    const structuredEpisodes = await netShortStructuredEpisodes(rawUrl);
    if (structuredEpisodes.length) return NextResponse.json({ episodes: normalizeEpisodes(structuredEpisodes, rawUrl), unavailable: false });
    if (!process.env.FIRECRAWL_API_KEY) return NextResponse.json({ episodes: normalizeEpisodes([], rawUrl), unavailable: false });
    const response = await fetch(`${process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev"}/v2/scrape`, { method: "POST", headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: rawUrl, formats: ["links", "markdown"] }), signal: AbortSignal.timeout(18000) });
    if (!response.ok) return NextResponse.json({ episodes: normalizeEpisodes([], rawUrl), unavailable: false });
    const payload = await response.json() as { data?: { links?: Array<string | { url?: string }>; markdown?: string } };
    const links = (payload.data?.links ?? []).map((item) => typeof item === "string" ? item : item.url ?? "").filter(Boolean);
    return NextResponse.json({ episodes: normalizeEpisodes([...netShortEpisodeUrls(rawUrl, payload.data?.markdown ?? ""), rawUrl, ...links], rawUrl), unavailable: false });
  } catch { return NextResponse.json({ episodes: normalizeEpisodes([], rawUrl), unavailable: false }); }
}
