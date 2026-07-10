"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, ChartBar, Eye, Fire, MagnifyingGlass, PlayCircle, Sparkle, TrendDown, TrendUp } from "@phosphor-icons/react";

type TrendDirection = "UP" | "DOWN" | "STABLE";
type RankingView = "Global Trending" | "Rising Now" | "Genre Ranking";

type Entry = {
  id: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  episodeCount?: number;
  hot_score?: number;
  confidence_score?: number;
  resourceCount: number;
  views: number;
  href: string;
  badge: string;
  platform?: string;
  platformId?: string;
  genre?: string[];
};

type GlobalEntry = {
  rank: number;
  cover: string;
  title: string;
  original_title?: string;
  clean_title?: string;
  description: string;
  platform: string;
  platformId: string;
  genre: string[];
  hot_score: number;
  trend: string;
  trend_direction: TrendDirection;
  confidence_score: number;
  episodes?: number;
  source_url?: string;
};

type Panel = { id: string; name: string; mode: string; entries: Entry[] };
type ComingSoonPlatform = { id: string; name: string; status: string; note: string; expected: string };
type TikTokTrendAnalysis = { title: string; note: string; keywords: Array<{ tag: string; status: string }> };
type RankingResponse = {
  globalTrending?: GlobalEntry[];
  panels?: Panel[];
  comingSoonPlatforms?: ComingSoonPlatform[];
  tiktokTrendAnalysis?: TikTokTrendAnalysis;
  quality?: { eligible: number; rejected: number; minimumConfidence: number; blockedReason: string };
};

const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
const PREVIEW_COUNT = 5;
const genres = ["All", "Romance", "CEO", "Mafia", "Werewolf", "Revenge", "Billionaire", "Fantasy", "Marriage"];
const rankingViews: RankingView[] = ["Global Trending", "Rising Now", "Genre Ranking"];

function trendIcon(direction?: TrendDirection) {
  if (direction === "UP") return <TrendUp size={15} weight="bold" />;
  if (direction === "DOWN") return <TrendDown size={15} weight="bold" />;
  return <ChartBar size={15} weight="bold" />;
}

function trendLabel(direction?: TrendDirection, label?: string) {
  if (label) return label;
  if (direction === "UP") return "Rising";
  if (direction === "DOWN") return "Cooling";
  return "Stable";
}

function detailHref(entry: GlobalEntry) {
  return `/rankings/drama?title=${encodeURIComponent(entry.title)}&platform=${encodeURIComponent(entry.platformId)}&cover=${encodeURIComponent(entry.cover)}&description=${encodeURIComponent(entry.description)}&genre=${encodeURIComponent(entry.genre.join(","))}&episodes=${encodeURIComponent(String(entry.episodes ?? ""))}&hot=${encodeURIComponent(String(entry.hot_score))}&trend=${encodeURIComponent(entry.trend_direction)}&source=${encodeURIComponent(entry.source_url ?? "")}`;
}

function SafeCover({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />;
}

export function LiveRankings() {
  const [data, setData] = useState<RankingResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [activeView, setActiveView] = useState<RankingView>("Global Trending");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rankings?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("排行榜暂时无法更新");
      setData(await response.json() as RankingResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "排行榜加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const globalTrending = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = (data.globalTrending ?? []).filter((entry) => {
      const haystack = `${entry.title} ${entry.description} ${entry.platform} ${entry.genre.join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesGenre = activeView !== "Genre Ranking" || genre === "All" || entry.genre.includes(genre);
      return matchesQuery && matchesGenre;
    });
    if (activeView === "Rising Now") return filtered.filter((entry) => entry.trend_direction === "UP").sort((a, b) => b.hot_score - a.hot_score);
    return filtered;
  }, [activeView, data.globalTrending, genre, query]);

  if (loading) return <div className="mt-4 grid gap-3"><div className="surface h-72 animate-pulse rounded-xl border line"/><div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="surface h-48 animate-pulse rounded-xl border line"/>)}</div></div>;
  if (error) return <div className="surface mt-4 rounded-xl border line p-6 text-center"><p className="font-semibold">{error}</p><button onClick={() => void load()} className="focus-ring pressable mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-sm font-medium"><ArrowClockwise size={16}/>重新加载</button></div>;

  return <div className="mt-4 space-y-5">
    <section className="surface overflow-hidden rounded-xl border line">
      <div className="grid gap-3 border-b line p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-strong)] px-2.5 py-1 text-[11px] font-semibold"><Fire size={13} weight="fill" className="accent"/>Drama Discovery</div>
          <h2 className="mt-2 text-lg font-semibold tracking-[-.02em] md:text-xl">全球热门短剧 TOP100</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">标准化剧名、剧情简介、类型、集数与热度说明；过滤 SEO 标题、EP 垃圾词和非官方内容。</p>
        </div>
        <div className="flex gap-3 text-[11px] text-muted md:grid md:gap-1 md:text-right">
          <span>可展示：{data.quality?.eligible ?? globalTrending.length} 条</span>
          <span>已过滤：{data.quality?.rejected ?? 0} 条低质候选</span>
        </div>
      </div>

      <div className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="surface-strong flex min-h-10 items-center gap-2 rounded-lg border line px-3">
          <MagnifyingGlass size={16} className="text-muted"/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dramas, CEO, Mafia, Werewolf..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"/>
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:max-w-[560px]">
          {genres.map((item) => <button key={item} onClick={() => setGenre(item)} className={`focus-ring pressable shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${genre === item ? "accent-bg border-transparent" : "surface line"}`}>{item}</button>)}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t line px-3 py-2">
        {rankingViews.map((item) => <button key={item} onClick={() => setActiveView(item)} className={`focus-ring pressable shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${activeView === item ? "accent-bg" : "surface-strong"}`}>{item}</button>)}
      </div>

      {globalTrending.length ? <ol className="divide-y line">
        {globalTrending.slice(0, 100).map((entry) => <li key={`${entry.platformId}:${entry.rank}:${entry.title}`}>
          <Link href={detailHref(entry)} className="focus-ring group grid grid-cols-[34px_72px_minmax(0,1fr)] gap-3 p-3 hover:bg-[color:var(--surface-strong)] md:grid-cols-[48px_100px_minmax(0,1fr)_108px] md:items-center">
            <span className={`grid size-8 place-items-center rounded-lg text-xs font-bold tabular-nums md:size-9 ${entry.rank <= 3 ? "accent-bg" : "surface-strong"}`}>#{entry.rank}</span>
            <span className="relative h-[105px] overflow-hidden rounded-lg bg-[color:var(--surface-strong)] md:h-[140px]"><SafeCover src={entry.cover} alt={`${entry.title} cover`}/></span>
            <span className="min-w-0">
              <strong className="line-clamp-2 text-sm leading-5 md:text-base">{entry.title}</strong>
              <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{entry.description}</span>
              <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted"><span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.platform}</span>{entry.genre.slice(0, 3).map((item) => <span key={item} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{item}</span>)}{entry.episodes && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.episodes} Episodes</span>}</span>
              <span className="mt-1.5 block text-[11px] text-muted">可信度 {entry.confidence_score}/100 · Based on platform rank, views, trend and freshness</span>
            </span>
            <span className="col-span-3 flex items-center justify-between gap-2 text-xs font-semibold md:col-span-1 md:grid md:justify-items-end">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1.5 font-bold text-red-700" title="Based on platform ranking, search trend, views and update frequency"><Fire size={14} weight="fill"/>Hot {entry.hot_score}</span>
              <span className="inline-flex items-center gap-1 text-muted">{trendIcon(entry.trend_direction)}{trendLabel(entry.trend_direction, entry.trend)}</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 md:hidden"/>
            </span>
          </Link>
        </li>)}
      </ol> : <div className="px-5 py-10 text-center"><Sparkle size={28} className="mx-auto text-muted"/><p className="mt-3 font-semibold">暂无通过可信度校验的榜单</p><p className="mt-1.5 text-xs text-muted">可切换分类，或确认 Vercel 已配置数据源 Key 并重新部署。</p></div>}
    </section>

    <section>
      <div className="flex items-end justify-between gap-4">
        <div><h2 className="text-lg font-semibold tracking-[-.02em]">Platform Rankings</h2><p className="mt-1 text-xs text-muted">每个平台只展示 Top 10 已验证短剧；未接入的平台以 Coming Soon 提示。</p></div>
        <button onClick={() => void load()} className="focus-ring pressable hidden min-h-9 items-center gap-2 rounded-lg border line px-3 text-xs font-medium sm:inline-flex"><ArrowClockwise size={15}/>刷新</button>
      </div>
      <div className="mt-3 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(data.panels ?? []).map((panel) => {
          const isExpanded = expanded[panel.id] === true;
          const visibleEntries = isExpanded ? panel.entries : panel.entries.slice(0, PREVIEW_COUNT);
          return <section key={panel.id} className="surface overflow-hidden rounded-xl border line">
            <div className="flex items-center justify-between border-b line px-3 py-3"><div><h3 className="text-base font-semibold">{panel.name}</h3><p className="mt-0.5 text-[11px] text-muted">已验证 {panel.entries.length} 条</p></div><ChartBar size={18} className="accent"/></div>
            <ol>{visibleEntries.map((entry, index) => <li key={entry.id} className="border-b line last:border-0"><Link href={entry.href} className="focus-ring group grid grid-cols-[28px_72px_minmax(0,1fr)] gap-2.5 px-3 py-3 hover:bg-[color:var(--surface-strong)] md:grid-cols-[28px_82px_minmax(0,1fr)]">
              <span className={`mt-1 grid size-7 place-items-center rounded-md text-xs font-semibold ${index < 3 ? "accent-bg" : "surface-strong"}`}>{index + 1}</span>
              <span className="relative h-[105px] overflow-hidden rounded-lg bg-[color:var(--surface-strong)] md:h-[118px]"><SafeCover src={entry.posterUrl} alt={`${entry.title} 真实封面`}/></span>
              <span className="min-w-0"><span className="flex items-start justify-between gap-2"><strong className="line-clamp-2 text-sm leading-5">{entry.title}</strong><ArrowRight size={15} className="mt-0.5 shrink-0 text-muted transition-transform group-hover:translate-x-1"/></span><span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{entry.synopsis}</span><span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">{entry.genre?.slice(0, 2).map((item) => <span key={item} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{item}</span>)}{entry.episodeCount && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.episodeCount} Episodes</span>}<span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.badge}</span></span><span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted">{entry.views > 0 && <span className="inline-flex items-center gap-1"><Eye size={12}/>{compact.format(entry.views)}</span>}<span className="inline-flex items-center gap-1"><PlayCircle size={12}/>{entry.resourceCount}</span>{entry.hot_score != null && <span>Hot {entry.hot_score}</span>}{entry.confidence_score != null && <span>信 {entry.confidence_score}</span>}</span></span>
            </Link></li>)}</ol>
            {panel.entries.length > PREVIEW_COUNT && <div className="border-t line p-3"><button onClick={() => setExpanded((value) => ({ ...value, [panel.id]: !isExpanded }))} className="focus-ring pressable w-full rounded-lg border line px-3 py-2 text-xs font-medium">{isExpanded ? "收起" : `查看更多 ${panel.entries.length - PREVIEW_COUNT} 条`}</button></div>}
          </section>;
        })}
      </div>
      {!!data.comingSoonPlatforms?.length && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.comingSoonPlatforms.map((platform) => <div key={platform.id} className="surface rounded-xl border line p-3">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{platform.name}</h3><span className="rounded-full bg-[color:var(--surface-strong)] px-2 py-1 text-[11px] font-semibold">{platform.status}</span></div>
          <p className="mt-1.5 text-xs leading-5 text-muted">{platform.note}</p>
          <p className="mt-2 text-[11px] font-medium text-muted">预计收录：{platform.expected}</p>
        </div>)}
      </div>}
    </section>

    {data.tiktokTrendAnalysis && <section className="surface rounded-xl border line p-4">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold">{data.tiktokTrendAnalysis.title}</h2><p className="mt-1 text-xs leading-5 text-muted">{data.tiktokTrendAnalysis.note}</p></div><ChartBar size={20} className="accent"/></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{data.tiktokTrendAnalysis.keywords.map((item) => <span key={item.tag} className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1.5 text-xs font-semibold">{item.tag}<span className="ml-1.5 text-[11px] text-muted">{item.status}</span></span>)}</div>
    </section>}
  </div>;
}
