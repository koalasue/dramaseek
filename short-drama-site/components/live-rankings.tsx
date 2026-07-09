"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, ChartBar, Eye, Fire, MagnifyingGlass, PlayCircle, Sparkle, TrendDown, TrendUp } from "@phosphor-icons/react";

type TrendDirection = "UP" | "DOWN" | "STABLE";
type Entry = {
  id: string;
  title: string;
  titleZh?: string;
  synopsis: string;
  posterUrl: string;
  episodeCount?: number;
  score: number;
  hot_score?: number;
  confidence_score?: number;
  resourceCount: number;
  views: number;
  href: string;
  badge: string;
  platform?: string;
  platformId?: string;
  genre?: string[];
  trend_direction?: TrendDirection;
  trend?: string;
};
type GlobalEntry = {
  rank: number;
  cover: string;
  title: string;
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
type TikTokTrendAnalysis = { title: string; note: string; keywords: Array<{ tag: string; status: string }> };
type RankingResponse = {
  globalTrending?: GlobalEntry[];
  panels?: Panel[];
  tiktokTrendAnalysis?: TikTokTrendAnalysis;
  quality?: { eligible: number; rejected: number; minimumConfidence: number; blockedReason: string };
  updatedAt?: string;
};

const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
const PREVIEW_COUNT = 5;
const genres = ["All", "Romance", "CEO", "Mafia", "Werewolf", "Revenge", "Billionaire", "Fantasy", "Marriage"];

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

function buildSearchHref(entry: GlobalEntry) {
  return `/?q=${encodeURIComponent(entry.title)}&platform=${entry.platformId}`;
}

function SafeCover({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className ?? ""}`} />;
}

export function LiveRankings() {
  const [data, setData] = useState<RankingResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");

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
    return (data.globalTrending ?? []).filter((entry) => {
      const matchesQuery = !normalizedQuery || `${entry.title} ${entry.platform} ${entry.genre.join(" ")}`.toLowerCase().includes(normalizedQuery);
      const matchesGenre = genre === "All" || entry.genre.includes(genre);
      return matchesQuery && matchesGenre;
    });
  }, [data.globalTrending, genre, query]);

  if (loading) return <div className="mt-4 grid gap-3"><div className="surface h-72 animate-pulse rounded-xl border line"/><div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="surface h-64 animate-pulse rounded-xl border line"/>)}</div></div>;
  if (error) return <div className="surface mt-4 rounded-xl border line p-6 text-center"><p className="font-semibold">{error}</p><button onClick={() => void load()} className="focus-ring pressable mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-sm font-medium"><ArrowClockwise size={16}/>重新加载</button></div>;

  return <div className="mt-4 space-y-5">
    <section className="surface overflow-hidden rounded-xl border line">
      <div className="grid gap-3 border-b line p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-strong)] px-2.5 py-1 text-[11px] font-semibold"><Fire size={13} weight="fill" className="accent"/>Global Trending</div>
          <h2 className="mt-2 text-lg font-semibold tracking-[-.02em] md:text-xl">全球热门短剧 TOP100</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">只展示官方来源、真实封面、明确集数和高可信度短剧。</p>
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:max-w-[520px]">
          {genres.map((item) => <button key={item} onClick={() => setGenre(item)} className={`focus-ring pressable shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${genre === item ? "accent-bg border-transparent" : "surface line"}`}>{item}</button>)}
        </div>
      </div>

      {globalTrending.length ? <ol className="divide-y line">
        {globalTrending.slice(0, 100).map((entry) => <li key={`${entry.platformId}:${entry.rank}:${entry.title}`}>
          <Link href={buildSearchHref(entry)} className="focus-ring group grid grid-cols-[34px_70px_minmax(0,1fr)] gap-3 p-3 hover:bg-[color:var(--surface-strong)] md:grid-cols-[46px_90px_minmax(0,1fr)_84px_88px] md:items-center">
            <span className={`grid size-8 place-items-center rounded-lg text-xs font-bold md:size-9 ${entry.rank <= 3 ? "accent-bg" : "surface-strong"}`}>#{entry.rank}</span>
            <span className="relative h-[100px] overflow-hidden rounded-lg bg-[color:var(--surface-strong)] md:h-[130px]"><SafeCover src={entry.cover} alt={`${entry.title} cover`}/></span>
            <span className="min-w-0">
              <strong className="line-clamp-2 text-sm leading-5 md:text-base">{entry.title}</strong>
              <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted"><span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.platform}</span>{entry.genre.slice(0, 2).map((item) => <span key={item} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{item}</span>)}{entry.episodes && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.episodes} 集</span>}</span>
              <span className="mt-1.5 block text-[11px] text-muted">可信度 {entry.confidence_score} / 100</span>
            </span>
            <span className="hidden md:block"><span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700"><Fire size={14} weight="fill"/>{entry.hot_score}</span></span>
            <span className="col-span-3 inline-flex items-center justify-between text-xs font-semibold md:col-span-1"><span className="inline-flex items-center gap-1 text-muted">{trendIcon(entry.trend_direction)}{trendLabel(entry.trend_direction, entry.trend)}</span><ArrowRight size={16} className="transition-transform group-hover:translate-x-1 md:hidden"/></span>
          </Link>
        </li>)}
      </ol> : <div className="px-5 py-10 text-center"><Sparkle size={28} className="mx-auto text-muted"/><p className="mt-3 font-semibold">暂无通过可信度校验的全球榜单</p><p className="mt-1.5 text-xs text-muted">请确认 Vercel 已配置 FIRECRAWL_API_KEY、SERPAPI_KEY、YOUTUBE_API_KEY，并重新部署。</p></div>}
    </section>

    <section>
      <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-[-.02em]">Platform Rankings</h2><p className="mt-1 text-xs text-muted">每个平台只展示 Top 10 已验证资源。</p></div><button onClick={() => void load()} className="focus-ring pressable hidden min-h-9 items-center gap-2 rounded-lg border line px-3 text-xs font-medium sm:inline-flex"><ArrowClockwise size={15}/>刷新</button></div>
      <div className="mt-3 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(data.panels ?? []).map((panel) => {
          const isExpanded = expanded[panel.id] === true;
          const visibleEntries = isExpanded ? panel.entries : panel.entries.slice(0, PREVIEW_COUNT);
          return <section key={panel.id} className="surface overflow-hidden rounded-xl border line">
            <div className="flex items-center justify-between border-b line px-3 py-3"><div><h3 className="text-base font-semibold">{panel.name}</h3><p className="mt-0.5 text-[11px] text-muted">{panel.entries.length ? `已验证 ${panel.entries.length} 条` : "暂无通过校验的资源"}</p></div><ChartBar size={18} className="accent"/></div>
            {panel.entries.length ? <><ol>{visibleEntries.map((entry, index) => <li key={entry.id} className="border-b line last:border-0"><Link href={entry.href} className="focus-ring group grid grid-cols-[28px_70px_minmax(0,1fr)] gap-2.5 px-3 py-3 hover:bg-[color:var(--surface-strong)] md:grid-cols-[28px_78px_minmax(0,1fr)]">
              <span className={`mt-1 grid size-7 place-items-center rounded-md text-xs font-semibold ${index < 3 ? "accent-bg" : "surface-strong"}`}>{index + 1}</span>
              <span className="relative h-[100px] overflow-hidden rounded-lg bg-[color:var(--surface-strong)] md:h-[112px]"><SafeCover src={entry.posterUrl} alt={`${entry.title} 真实封面`}/></span>
              <span className="min-w-0"><span className="flex items-start justify-between gap-2"><strong className="line-clamp-2 text-sm leading-5">{entry.title}</strong><ArrowRight size={15} className="mt-0.5 shrink-0 text-muted transition-transform group-hover:translate-x-1"/></span><span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{entry.synopsis}</span><span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">{entry.genre?.slice(0, 2).map((item) => <span key={item} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{item}</span>)}<span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entry.badge}</span></span><span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted">{entry.views > 0 && <span className="inline-flex items-center gap-1"><Eye size={12}/>{compact.format(entry.views)}</span>}<span className="inline-flex items-center gap-1"><PlayCircle size={12}/>{entry.resourceCount}</span>{entry.confidence_score != null && <span>信 {entry.confidence_score}</span>}</span></span>
            </Link></li>)}</ol>{panel.entries.length > PREVIEW_COUNT && <div className="border-t line p-4"><button onClick={() => setExpanded((value) => ({ ...value, [panel.id]: !isExpanded }))} className="focus-ring pressable w-full rounded-xl border line px-4 py-3 text-sm font-medium">{isExpanded ? "收起" : `查看更多 ${panel.entries.length - PREVIEW_COUNT} 条`}</button></div>}</> : <div className="px-6 py-12 text-center"><p className="font-medium">暂无已验证榜单</p><p className="mt-2 text-xs leading-5 text-muted">未通过官方来源、封面、集数和可信度校验的数据不会展示。</p></div>}
          </section>;
        })}
      </div>
    </section>

    {data.tiktokTrendAnalysis && <section className="surface rounded-xl border line p-4">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold">{data.tiktokTrendAnalysis.title}</h2><p className="mt-1 text-xs leading-5 text-muted">{data.tiktokTrendAnalysis.note}</p></div><ChartBar size={20} className="accent"/></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{data.tiktokTrendAnalysis.keywords.map((item) => <span key={item.tag} className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1.5 text-xs font-semibold">{item.tag}<span className="ml-1.5 text-[11px] text-muted">{item.status}</span></span>)}</div>
    </section>}
  </div>;
}
