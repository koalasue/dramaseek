"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowSquareOut, FadersHorizontal, MagnifyingGlass, SealCheck, X } from "@phosphor-icons/react";
import { searchDramas } from "@/lib/search";
import type { Drama, Language, LiveSearchResponse, LiveSearchResource, Platform } from "@/lib/types";
import { PlatformMark } from "@/components/platform-mark";
import { PlatformSearchFallback } from "@/components/platform-search-fallback";

export function SearchExperience({ dramas, platforms, initialQuery = "", initialPlatform = "all", embedded = false }: { dramas: Drama[]; platforms: Platform[]; initialQuery?: string; initialPlatform?: string; embedded?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState(initialPlatform);
  const [language, setLanguage] = useState<Language | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [liveResources, setLiveResources] = useState<LiveSearchResource[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<LiveSearchResponse["platformStatus"]>({});
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
    <section aria-label="短剧搜索" className={embedded ? "mt-8 md:mt-10" : "page-shell py-10 md:py-14"}>
      <div className="surface rounded-2xl border line p-3 shadow-[0_20px_50px_rgba(40,32,25,0.06)] md:p-4">
        <label htmlFor="drama-query" className="sr-only">输入剧名、英文名或别名</label>
        <div className="flex items-center gap-3">
          <MagnifyingGlass size={24} className="ml-2 shrink-0 text-muted" />
          <input id="drama-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入剧名、英文名或别名" className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-[color:var(--muted)] md:text-lg" />
          {query && <button className="focus-ring rounded-lg p-2 text-muted" onClick={() => setQuery("")} aria-label="清空搜索"><X size={18} /></button>}
          <button className="focus-ring pressable hidden rounded-xl border line px-4 py-3 text-sm font-medium sm:inline-flex sm:items-center sm:gap-2" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><FadersHorizontal size={18} />筛选</button>
        </div>
        <button className="focus-ring pressable mt-2 flex w-full items-center justify-center gap-2 rounded-xl border line px-4 py-3 text-sm font-medium sm:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><FadersHorizontal size={18} />筛选平台与语言</button>
        {showFilters && <div className="mt-3 grid gap-3 border-t line pt-4">
          <label className="grid gap-2 text-sm font-medium">语言<select value={language} onChange={(event) => setLanguage(event.target.value as Language | "all")} className="focus-ring surface-strong rounded-xl border line px-3 py-3"><option value="all">全部语言</option><option value="zh">中文</option><option value="en">英文</option><option value="es">西班牙语</option></select></label>
        </div>}
      </div>

      <div className="mt-5 overflow-x-auto pb-1" role="tablist" aria-label="按来源筛选">
        <div className="flex min-w-max gap-2">
          {[{ slug: "all", name: "全部", count: totalCount }, ...platforms.map((item) => ({ slug: item.slug, name: item.name, count: counts[item.slug] ?? 0 }))].map((item) => <button key={item.slug} role="tab" aria-selected={platform === item.slug} onClick={() => setPlatform(item.slug)} className={`focus-ring pressable whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium ${platform === item.slug ? "accent-bg border-transparent" : "surface line"}`}>{item.name} ({item.count})</button>)}
        </div>
      </div>

      <div className="mt-7 flex items-baseline justify-between gap-4"><h2 className="text-xl font-semibold tracking-tight">{query ? `“${query}” 的结果` : "热门短剧"}</h2><p className="text-sm text-muted">{results.length + visibleLive.length} 条资源</p></div>
      {liveLoading && <div className="surface mt-4 rounded-2xl border line p-6"><div className="h-4 w-40 animate-pulse rounded bg-[color:var(--surface-strong)]"/><div className="mt-4 h-24 animate-pulse rounded-xl bg-[color:var(--surface-strong)]"/></div>}
      {!liveLoading && visibleLive.length > 0 && <div className="mt-4 grid gap-4">{visibleLive.map((resource) => { const livePlatform = platforms.find((item) => item.id === resource.platformId); return <article key={resource.id} className="result-enter surface grid overflow-hidden rounded-2xl border line sm:grid-cols-[170px_1fr_auto]">
        <div className="relative min-h-48 bg-[color:var(--surface-strong)]">{resource.thumbnailUrl && <Image src={resource.thumbnailUrl} alt={`${resource.title} 封面`} fill sizes="170px" className="object-cover" />}</div>
        <div className="p-5"><div className="flex flex-wrap gap-3 text-xs text-muted"><span>{livePlatform?.name ?? "平台"} 实时结果</span>{resource.durationSeconds != null && <span>{Math.round(resource.durationSeconds / 60)} 分钟</span>}<span>{resource.contentType === "full_series" ? "完整合集" : "剧集页面"}</span></div><h3 className="mt-3 text-xl font-semibold tracking-tight">{resource.title}</h3><p className="mt-3 text-sm text-muted">来源：{resource.uploader}</p><p className="mt-2 text-xs text-muted">{resource.verifiedOfficial ? "来自平台官方域名，已通过剧名与正片特征过滤。" : "这是平台实时搜索结果，已排除常见解说、预告与影评；账号授权状态仍需用户核对。"}</p></div>
        <div className="flex items-end justify-end p-5 sm:col-span-3 sm:pt-0 lg:col-span-1 lg:p-5"><Link href={`/watch?url=${encodeURIComponent(resource.url)}&title=${encodeURIComponent(resource.title)}`} className="focus-ring pressable inline-flex items-center gap-2 whitespace-nowrap rounded-xl border line px-5 py-3 text-sm font-semibold">前往观看<ArrowSquareOut size={17}/></Link></div>
      </article>})}</div>}
      {results.length ? <div className="mt-4 grid gap-4">
        {results.map((drama, index) => <article key={drama.id} style={{ animationDelay: `${index * 45}ms` }} className="result-enter surface group grid overflow-hidden rounded-2xl border line sm:grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr_auto]">
          <Link href={`/drama/${drama.slug}`} className="relative min-h-52 overflow-hidden sm:min-h-full" aria-label={`查看 ${drama.titleZh}`}>
            <Image src={drama.posterUrl} alt={`${drama.titleZh}海报`} fill sizes="(max-width: 640px) 100vw, 170px" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          </Link>
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><SealCheck size={15} weight="fill" className="accent" />正版来源</span><span>{drama.episodeCount ? `${drama.episodeCount} 集` : "集数待确认"}</span><span>{drama.languages.map((item) => item.toUpperCase()).join(" / ")}</span></div>
            <Link href={`/drama/${drama.slug}`} className="focus-ring mt-3 block rounded-md"><h3 className="text-xl font-semibold tracking-tight md:text-2xl">{/[A-Za-z]/.test(query) && !/[\p{Script=Han}]/u.test(query) ? drama.titleEn : drama.titleZh}</h3><p className="mt-1 text-sm text-muted">{/[A-Za-z]/.test(query) && !/[\p{Script=Han}]/u.test(query) ? drama.titleZh : drama.titleEn}</p></Link>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{drama.synopsis}</p>
            <div className="mt-5 flex flex-wrap gap-3">{drama.resources.slice(0, 4).map((resource) => { const item = platforms.find((entry) => entry.id === resource.platformId); return item ? <span key={resource.id} className="rounded-xl border line px-3 py-2 text-sm"><PlatformMark platform={item} /></span> : null; })}</div>
          </div>
          <div className="flex items-end justify-end p-5 pt-0 sm:col-span-2 lg:col-span-1 lg:p-6"><Link href={`/drama/${drama.slug}`} className="focus-ring pressable flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border line px-5 py-3 text-sm font-semibold hover:bg-[color:var(--surface-strong)]">查看来源<ArrowRight size={17} /></Link></div>
        </article>)}
      </div> : !liveLoading && visibleLive.length === 0 && <div className="surface mt-4 rounded-2xl border line px-6 py-12 text-center"><MagnifyingGlass size={32} className="mx-auto text-muted" /><h3 className="mt-4 text-lg font-semibold">没有通过正片筛选的资源</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">该平台可能尚未接入实时接口，或搜索结果只有解说、预告与未匹配内容。</p><Link href="/submit" className="focus-ring accent-bg pressable mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">提交资源</Link></div>}
      {query && platformStatus[platform === "all" ? "youtube" : platform] === "needs_key" && <p className="mt-3 text-xs text-muted">YouTube 实时搜索需要配置官方 Data API Key，目前计数为 0。</p>}
      {query && platform !== "all" && ["reelshort", "dramabox", "netshort"].includes(platform) && platformStatus[platform] === "needs_key" && <p className="mt-3 text-xs text-muted">该平台的实时发现需要配置 Firecrawl API Key，目前仅显示已收录资源。</p>}
      <PlatformSearchFallback query={query} platforms={platforms} selectedPlatform={platform} />
    </section>
  );
}
