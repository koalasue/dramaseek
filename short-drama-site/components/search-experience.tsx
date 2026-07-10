"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowSquareOut, FadersHorizontal, MagnifyingGlass, SealCheck, X } from "@phosphor-icons/react";
import { searchDramas } from "@/lib/search";
import type { Drama, Language, LiveSearchResponse, LiveSearchResource, Platform } from "@/lib/types";
import { cleanDramaTitle, shortDescription } from "@/lib/rankings/metadata";
import { normalizePlayback } from "@/lib/playback";
import { PlatformMark } from "@/components/platform-mark";
import { PlatformSearchFallback } from "@/components/platform-search-fallback";

const recentSearchesKey = "dramaseek:recent-searches";
type RecentSearch = { keyword: string; time: string };
const platformTabOrder = ["dailymotion", "youtube", "reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv", "tiktok"];

export function SearchExperience({ dramas, platforms, initialQuery = "", initialPlatform = "all", embedded = false }: { dramas: Drama[]; platforms: Platform[]; initialQuery?: string; initialPlatform?: string; embedded?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState(initialPlatform);
  const [language, setLanguage] = useState<Language | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [liveResources, setLiveResources] = useState<LiveSearchResource[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<LiveSearchResponse["platformStatus"]>({});
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const orderedPlatforms = useMemo(() => [...platforms].sort((a, b) => {
    const left = platformTabOrder.indexOf(a.slug);
    const right = platformTabOrder.indexOf(b.slug);
    return (left === -1 ? 999 : left) - (right === -1 ? 999 : right) || a.name.localeCompare(b.name);
  }), [platforms]);
  const allIndexedResults = useMemo(() => searchDramas(dramas, platforms, { query, platform: "all", language }), [dramas, platforms, query, language]);
  const results = useMemo(() => searchDramas(dramas, platforms, { query, platform, language }), [dramas, platforms, query, platform, language]);
  const visibleLive = useMemo(() => liveResources.filter((resource) => platform === "all" || resource.platformId === platform), [liveResources, platform]);
  const counts = useMemo(() => {
    const values: Record<string, number> = Object.fromEntries(platforms.map((item) => [item.slug, 0]));
    allIndexedResults.forEach((drama) => drama.resources.forEach((resource) => { const item = platforms.find((entry) => entry.id === resource.platformId); if (item) values[item.slug] = (values[item.slug] ?? 0) + 1; }));
    liveResources.forEach((resource) => { const item = platforms.find((entry) => entry.id === resource.platformId); if (item) values[item.slug] = (values[item.slug] ?? 0) + 1; });
    return values;
  }, [allIndexedResults, liveResources, platforms]);
  const totalCount = Object.values(counts).reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(recentSearchesKey) ?? "[]") as Array<string | RecentSearch>;
      setRecentSearches(saved.map((item) => typeof item === "string" ? { keyword: item, time: new Date().toISOString() } : item).filter((item) => item.keyword).slice(0, 10));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const timer = window.setTimeout(() => {
      setRecentSearches((items) => {
        const next = [{ keyword: value, time: new Date().toISOString() }, ...items.filter((item) => item.keyword.toLowerCase() !== value.toLowerCase())].slice(0, 10);
        window.localStorage.setItem(recentSearchesKey, JSON.stringify(next));
        return next;
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) { setLiveResources([]); setLiveLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLiveLoading(true);
      try {
        const response = await fetch(`/api/live-search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const payload = await response.json() as LiveSearchResponse;
        setLiveResources(payload.resources); setPlatformStatus(payload.platformStatus);
      } catch { if (!controller.signal.aborted) setLiveResources([]); }
      finally { if (!controller.signal.aborted) setLiveLoading(false); }
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  return (
    <section aria-label="短剧搜索" className={embedded ? "mt-4 md:mt-5" : "page-shell py-5 md:py-6"}>
      <div className="surface rounded-xl border line p-2.5 shadow-[0_10px_24px_rgba(40,32,25,0.04)] md:p-3">
        <label htmlFor="drama-query" className="sr-only">输入剧名、英文名或别名</label>
        <div className="flex items-center gap-3">
          <MagnifyingGlass size={20} className="ml-1 shrink-0 text-muted" />
          <input id="drama-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入剧名、英文名、关键词或类型" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-[color:var(--muted)]" />
          {query && <button className="focus-ring rounded-lg p-2 text-muted" onClick={() => setQuery("")} aria-label="清空搜索"><X size={18} /></button>}
          <button className="focus-ring pressable hidden rounded-lg border line px-3 py-2.5 text-sm font-medium sm:inline-flex sm:items-center sm:gap-2" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><FadersHorizontal size={17} />筛选</button>
        </div>
        <button className="focus-ring pressable mt-2 flex w-full items-center justify-center gap-2 rounded-lg border line px-3 py-2.5 text-sm font-medium sm:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><FadersHorizontal size={17} />筛选平台与语言</button>
        {showFilters && <div className="mt-2 grid gap-2 border-t line pt-3">
          <label className="grid gap-1.5 text-sm font-medium">语言<select value={language} onChange={(event) => setLanguage(event.target.value as Language | "all")} className="focus-ring surface-strong rounded-lg border line px-3 py-2.5"><option value="all">全部语言</option><option value="zh">中文</option><option value="en">英文</option><option value="es">西班牙语</option></select></label>
        </div>}
      </div>

      {!!recentSearches.length && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-muted">Recent Searches</span>
        {recentSearches.map((item) => <span key={`${item.keyword}:${item.time}`} className="inline-flex items-center overflow-hidden rounded-full bg-[color:var(--surface-strong)] font-medium"><button onClick={() => setQuery(item.keyword)} className="focus-ring px-2.5 py-1">{item.keyword}</button><button onClick={() => setRecentSearches((items) => { const next = items.filter((entry) => entry.time !== item.time); window.localStorage.setItem(recentSearchesKey, JSON.stringify(next)); return next; })} className="focus-ring border-l line px-2 py-1 text-muted" aria-label={`删除 ${item.keyword}`}>×</button></span>)}
        <button onClick={() => { window.localStorage.removeItem(recentSearchesKey); setRecentSearches([]); }} className="focus-ring rounded-full px-2.5 py-1 text-muted underline-offset-4 hover:underline">Clear All</button>
      </div>}

      <div className="mt-3 overflow-x-auto pb-1" role="tablist" aria-label="按来源筛选">
        <div className="flex min-w-max gap-1.5">
          {[{ slug: "all", name: "全部", count: totalCount }, ...orderedPlatforms.map((item) => ({ slug: item.slug, name: item.name, count: counts[item.slug] ?? 0 }))].map((item) => <button key={item.slug} role="tab" aria-selected={platform === item.slug} onClick={() => setPlatform(item.slug)} className={`focus-ring pressable whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium ${platform === item.slug ? "accent-bg border-transparent" : "surface line"}`}>{item.name} ({item.count})</button>)}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4"><h2 className="text-base font-semibold tracking-tight md:text-lg">{query ? `“${query}” 的结果` : "热门短剧"}</h2><p className="text-xs text-muted">{results.length + visibleLive.length} 条资源</p></div>
      {liveLoading && <div className="surface mt-3 rounded-xl border line p-4"><div className="h-3 w-32 animate-pulse rounded bg-[color:var(--surface-strong)]"/><div className="mt-3 h-20 animate-pulse rounded-lg bg-[color:var(--surface-strong)]"/></div>}
      {!liveLoading && visibleLive.length > 0 && <div className="mt-3 grid gap-2">{visibleLive.map((resource) => { const livePlatform = platforms.find((item) => item.id === resource.platformId); const cleanedTitle = cleanDramaTitle(resource.title); const playback = normalizePlayback(resource); const description = shortDescription({ title: resource.title, description: resource.description, genre: resource.genre, cleanTitle: cleanedTitle }); return <article key={resource.id} className="result-enter surface grid grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-xl border line p-3 md:grid-cols-[90px_minmax(0,1fr)_auto] md:items-center">
        <div className="relative h-[100px] overflow-hidden rounded-lg bg-[color:var(--surface-strong)] md:h-[130px]">{resource.thumbnailUrl && <Image src={resource.thumbnailUrl} alt={`${resource.title} 封面`} fill sizes="(max-width: 640px) 70px, 90px" className="object-cover" />}</div>
        <div className="min-w-0"><div className="flex flex-wrap gap-1.5 text-[11px] text-muted"><span>{livePlatform?.name ?? "平台"}</span>{resource.durationSeconds != null && <span>{Math.round(resource.durationSeconds / 60)} 分钟</span>}<span>{resource.contentType === "full_series" ? "完整合集" : "剧集页面"}</span><span>{playback.label}</span></div><h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 md:text-base">{cleanedTitle}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{description}</p><p className="mt-1.5 truncate text-[11px] text-muted">来源：{resource.uploader} · Quality {playback.qualityScore}</p></div>
        <div className="col-span-2 flex justify-end md:col-span-1"><Link href={`/watch?url=${encodeURIComponent(resource.url)}&title=${encodeURIComponent(cleanedTitle)}`} className="focus-ring pressable inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border line px-3 text-xs font-semibold">{playback.label}<ArrowSquareOut size={15}/></Link></div>
      </article>})}</div>}
      {results.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">
        {results.map((drama, index) => <article key={drama.id} style={{ animationDelay: `${index * 30}ms` }} className="result-enter surface group grid grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-xl border line p-3 md:grid-cols-[90px_minmax(0,1fr)]">
          <Link href={`/drama/${drama.slug}`} className="relative h-[100px] overflow-hidden rounded-lg md:h-[130px]" aria-label={`查看 ${drama.titleZh}`}>
            <Image src={drama.posterUrl} alt={`${drama.titleZh}海报`} fill sizes="(max-width: 640px) 70px, 90px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><SealCheck size={13} weight="fill" className="accent" />正版</span><span>{drama.episodeCount ? `${drama.episodeCount} 集` : "集数待确认"}</span><span>{drama.languages.map((item) => item.toUpperCase()).join(" / ")}</span></div>
            <Link href={`/drama/${drama.slug}`} className="focus-ring mt-1 block rounded-md"><h3 className="line-clamp-2 text-sm font-semibold leading-5 md:text-base">{/[A-Za-z]/.test(query) && !/[\p{Script=Han}]/u.test(query) ? drama.titleEn : drama.titleZh}</h3><p className="mt-0.5 truncate text-xs text-muted">{/[A-Za-z]/.test(query) && !/[\p{Script=Han}]/u.test(query) ? drama.titleZh : drama.titleEn}</p></Link>
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{drama.synopsis}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{drama.resources.slice(0, 3).map((resource) => { const item = platforms.find((entry) => entry.id === resource.platformId); return item ? <span key={resource.id} className="rounded-md border line px-2 py-1 text-[11px]"><PlatformMark platform={item} compact /></span> : null; })}</div>
            <Link href={`/drama/${drama.slug}`} className="focus-ring mt-2 inline-flex items-center gap-1 rounded-md text-xs font-semibold text-[color:var(--accent)]">查看来源<ArrowRight size={14} /></Link>
          </div>
        </article>)}
      </div> : !liveLoading && visibleLive.length === 0 && <div className="surface mt-3 rounded-xl border line px-5 py-8 text-center"><MagnifyingGlass size={28} className="mx-auto text-muted" /><h3 className="mt-3 text-base font-semibold">没有通过正片筛选的资源</h3><p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted">该平台可能尚未接入实时接口，或搜索结果只有解说、预告与未匹配内容。</p><Link href="/submit" className="focus-ring accent-bg pressable mt-4 inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold">提交资源</Link></div>}
      {query && platformStatus[platform === "all" ? "youtube" : platform] === "needs_key" && <p className="mt-3 text-xs text-muted">YouTube 实时搜索需要配置官方 Data API Key，目前计数为 0。</p>}
      {query && platform !== "all" && ["reelshort", "dramabox", "netshort"].includes(platform) && platformStatus[platform] === "needs_key" && <p className="mt-3 text-xs text-muted">该平台的实时发现需要配置 Firecrawl API Key，目前仅显示已收录资源。</p>}
      <PlatformSearchFallback query={query} platforms={orderedPlatforms} selectedPlatform={platform} />
    </section>
  );
}
