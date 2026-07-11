"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, Eye, Fire, MagnifyingGlass, Trophy } from "@phosphor-icons/react";
import { matchDramaEntity, toDramaEntity } from "@/lib/drama-entity";
import type { Drama } from "@/lib/types";

type GlobalEntry = {
  rank: number;
  cover: string;
  title: string;
  clean_title?: string;
  description: string;
  platform: string;
  platformId: string;
  genre: string[];
  hot_score: number;
  episodes?: number;
  views?: number;
  likes?: number;
  source_url?: string;
};

type PanelEntry = {
  id: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  episodeCount?: number;
  hot_score?: number;
  views: number;
  platform?: string;
  platformId?: string;
  genre?: string[];
};

type Panel = { id: string; name: string; entries: PanelEntry[] };
type RankingResponse = { globalTrending?: GlobalEntry[]; panels?: Panel[]; updatedAt?: string };

type DramaRankingItem = {
  key: string;
  platformId: string;
  platformName: string;
  rank: number;
  drama: Drama;
  title: string;
  cover: string;
  description: string;
  genre: string[];
  episodes?: number;
  views?: number;
  likes?: number;
  hotScore: number;
  sourceUrl?: string;
};

const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
const platformOrder = [
  ["reelshort", "ReelShort TOP"],
  ["dramabox", "DramaBox TOP"],
  ["shortmax", "ShortMax TOP"],
  ["goodshort", "GoodShort TOP"],
  ["flextv", "FlexTV TOP"],
  ["youtube", "YouTube Trending"],
  ["dailymotion", "Dailymotion Trending"],
] as const;

function fallbackItems(dramas: Drama[], platformId: string, platformName: string): DramaRankingItem[] {
  return [...dramas]
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 8)
    .map((drama, index) => {
      const entity = toDramaEntity(drama);
      return {
        key: `${platformId}:fallback:${drama.id}`,
        platformId,
        platformName,
        rank: index + 1,
        drama,
        title: entity.canonical_title,
        cover: entity.cover,
        description: entity.description,
        genre: entity.genre,
        episodes: entity.episodes,
        hotScore: drama.trendingScore,
      };
    });
}

function fromGlobalEntries(dramas: Drama[], entries: GlobalEntry[] | undefined): DramaRankingItem[] {
  return (entries ?? []).flatMap((entry) => {
    const drama = matchDramaEntity(dramas, entry.clean_title ?? entry.title);
    if (!drama) return [];
    const entity = toDramaEntity(drama);
    return [{
      key: `${entry.platformId}:${entry.rank}:${drama.id}`,
      platformId: entry.platformId,
      platformName: entry.platform,
      rank: entry.rank,
      drama,
      title: entity.canonical_title,
      cover: entry.cover || entity.cover,
      description: entry.description || entity.description,
      genre: entry.genre?.length ? entry.genre : entity.genre,
      episodes: entry.episodes ?? entity.episodes,
      views: entry.views,
      likes: entry.likes,
      hotScore: entry.hot_score || drama.trendingScore,
      sourceUrl: entry.source_url,
    }];
  });
}

function fromPanels(dramas: Drama[], panels: Panel[] | undefined): DramaRankingItem[] {
  return (panels ?? []).flatMap((panel) => panel.entries.flatMap((entry, index) => {
    const drama = matchDramaEntity(dramas, entry.title);
    if (!drama) return [];
    const entity = toDramaEntity(drama);
    return [{
      key: `${panel.id}:${entry.id}:${drama.id}`,
      platformId: entry.platformId ?? panel.id,
      platformName: entry.platform ?? panel.name.replace(/\s+TOP.*/i, ""),
      rank: index + 1,
      drama,
      title: entity.canonical_title,
      cover: entry.posterUrl || entity.cover,
      description: entry.synopsis || entity.description,
      genre: entry.genre?.length ? entry.genre : entity.genre,
      episodes: entry.episodeCount ?? entity.episodes,
      views: entry.views,
      hotScore: entry.hot_score ?? drama.trendingScore,
    }];
  }));
}

export function LiveRankings({ dramas }: { dramas: Drama[] }) {
  const [data, setData] = useState<RankingResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activePlatform, setActivePlatform] = useState("all");

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

  const grouped = useMemo(() => {
    const apiItems = [...fromGlobalEntries(dramas, data.globalTrending), ...fromPanels(dramas, data.panels)];
    return platformOrder.map(([platformId, platformName]) => {
      const seen = new Set<string>();
      const matched = apiItems
        .filter((item) => item.platformId === platformId)
        .filter((item) => {
          if (seen.has(item.drama.id)) return false;
          seen.add(item.drama.id);
          return true;
        })
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 10)
        .map((item, index) => ({ ...item, rank: index + 1, platformName }));
      return { platformId, platformName, entries: matched.length ? matched : fallbackItems(dramas, platformId, platformName) };
    });
  }, [data.globalTrending, data.panels, dramas]);

  const visibleGroups = grouped
    .filter((group) => activePlatform === "all" || group.platformId === activePlatform)
    .map((group) => ({
      ...group,
      entries: group.entries.filter((item) => {
        const value = query.trim().toLowerCase();
        if (!value) return true;
        return `${item.title} ${item.description} ${item.genre.join(" ")}`.toLowerCase().includes(value);
      }),
    }))
    .filter((group) => group.entries.length);

  if (loading) return <div className="mt-4 grid gap-3 md:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="surface h-60 animate-pulse rounded-xl border line"/>)}</div>;
  if (error) return <div className="surface mt-4 rounded-xl border line p-6 text-center"><p className="font-semibold">{error}</p><button onClick={() => void load()} className="focus-ring pressable mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-sm font-medium"><ArrowClockwise size={16}/>重新加载</button></div>;

  return <div className="mt-4">
    <section className="surface rounded-xl border line p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <label className="surface-strong flex min-h-11 items-center gap-2 rounded-lg border line px-3">
          <MagnifyingGlass size={16} className="text-muted"/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ranked dramas, CEO, Werewolf..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"/>
        </label>
        <div className="flex gap-1.5 overflow-x-auto">
          {[["all", "All"], ...platformOrder].map(([id, label]) => <button key={id} onClick={() => setActivePlatform(id)} className={`focus-ring pressable min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold ${activePlatform === id ? "accent-bg border-transparent" : "surface line"}`}>{label}</button>)}
        </div>
      </div>
    </section>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {visibleGroups.map((group) => <section key={group.platformId} className="surface overflow-hidden rounded-xl border line">
        <div className="flex items-center justify-between gap-3 border-b line px-4 py-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold"><Trophy size={18} className="accent"/>{group.platformName}</h2>
            <p className="mt-0.5 text-xs text-muted">Platform Drama Ranking · {group.entries.length} titles</p>
          </div>
          <button onClick={() => void load()} className="focus-ring hidden min-h-9 items-center gap-1.5 rounded-lg border line px-3 text-xs font-semibold sm:inline-flex"><ArrowClockwise size={14}/>刷新</button>
        </div>
        <ol className="divide-y line">
          {group.entries.map((item) => <li key={item.key}>
            <Link href={`/drama/${item.drama.slug}#resource-search`} className="focus-ring group grid grid-cols-[34px_76px_minmax(0,1fr)] gap-3 p-3 hover:bg-[color:var(--surface-strong)] sm:grid-cols-[40px_88px_minmax(0,1fr)_auto] sm:items-center">
              <span className={`grid size-8 place-items-center rounded-lg text-xs font-bold tabular-nums ${item.rank <= 3 ? "accent-bg" : "surface-strong"}`}>{item.rank}</span>
              <span className="relative h-28 overflow-hidden rounded-lg bg-[color:var(--surface-strong)] sm:h-32">
                <Image src={item.cover} alt={`${item.title} cover`} fill sizes="88px" className="object-cover transition-transform group-hover:scale-[1.03]"/>
              </span>
              <span className="min-w-0">
                <strong className="line-clamp-2 text-sm leading-5 sm:text-base">{item.title}</strong>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.description}</span>
                <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
                  {item.genre.slice(0, 3).map((tag) => <span key={tag} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{tag}</span>)}
                  {item.episodes && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{item.episodes} Episodes</span>}
                </span>
                <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  {item.views ? <span className="inline-flex items-center gap-1"><Eye size={12}/>{compact.format(item.views)}</span> : null}
                  {item.likes ? <span>{compact.format(item.likes)} likes</span> : null}
                  <span className="inline-flex items-center gap-1"><Fire size={12} weight="fill"/>热度 {item.hotScore}</span>
                </span>
              </span>
              <span className="col-span-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border line px-3 text-xs font-semibold sm:col-span-1">
                Search Resource<ArrowRight size={14}/>
              </span>
            </Link>
          </li>)}
        </ol>
      </section>)}
    </div>
  </div>;
}
