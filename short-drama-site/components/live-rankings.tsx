"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, ChartBar, Eye, PlayCircle, UsersThree } from "@phosphor-icons/react";

type Entry = { id: string; title: string; titleZh: string; synopsis: string; posterUrl: string; episodeCount?: number; languages: string[]; score: number; resourceCount: number; views: number; likes: number; comments: number; mentions: number; creators: number; href: string; badge: string };
type Panel = { id: string; name: string; mode: string; entries: Entry[] };
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });

export function LiveRankings() {
  const [panels, setPanels] = useState<Panel[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/rankings"); if (!response.ok) throw new Error("排行榜暂时无法更新"); const result = await response.json() as { panels?: Panel[] }; setPanels(result.panels ?? []); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "排行榜加载失败"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="mt-9 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]" aria-label="正在加载真实排行榜">{Array.from({ length: 4 }, (_, index) => <div key={index} className="surface h-96 animate-pulse rounded-2xl border line"/>)}</div>;
  if (error) return <div className="surface mt-9 rounded-2xl border line p-8 text-center"><p className="font-semibold">{error}</p><button onClick={() => void load()} className="focus-ring pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border line px-4 text-sm font-medium"><ArrowClockwise size={17}/>重新加载</button></div>;

  return <div className="mt-9 grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
    {panels.map((panel) => <section key={panel.id} className="surface overflow-hidden rounded-2xl border line">
      <div className="flex items-center justify-between border-b line px-5 py-4"><div><h2 className="text-lg font-semibold">{panel.name}</h2><p className="mt-1 text-xs text-muted">{panel.mode}</p></div><ChartBar size={22} className="accent"/></div>
      {panel.entries.length ? <ol>{panel.entries.map((entry, index) => <li key={entry.id} className="border-b line last:border-0"><Link href={entry.href} className="focus-ring group grid min-h-44 grid-cols-[32px_92px_minmax(0,1fr)] gap-3 px-4 py-4 hover:bg-[color:var(--surface-strong)]">
        <span className={`mt-1 grid size-8 place-items-center rounded-lg text-sm font-semibold ${index < 3 ? "accent-bg" : "surface-strong"}`}>{index + 1}</span>
        <span className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[color:var(--surface-strong)]"><Image src={entry.posterUrl} alt={`${entry.title} 真实封面`} fill sizes="92px" className="object-cover"/></span>
        <span className="min-w-0"><span className="flex items-start justify-between gap-2"><strong className="line-clamp-2 leading-5">{entry.title}</strong><ArrowRight size={17} className="mt-0.5 shrink-0 text-muted transition-transform group-hover:translate-x-1"/></span><span className="mt-1 block truncate text-xs text-muted">{entry.titleZh}</span><span className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{entry.synopsis}</span><span className="mt-2 inline-flex rounded-md bg-[color:var(--surface-strong)] px-2 py-1 text-[11px] font-medium">{entry.badge}</span><span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">{entry.views > 0 && <span className="inline-flex items-center gap-1"><Eye size={13}/>{compact.format(entry.views)}</span>}<span className="inline-flex items-center gap-1"><PlayCircle size={13}/>{entry.resourceCount} 个资源</span>{entry.mentions > 0 && <span className="inline-flex items-center gap-1"><UsersThree size={13}/>{entry.mentions} 条讨论</span>}</span></span>
      </Link></li>)}</ol> : <div className="px-6 py-12 text-center"><p className="font-medium">暂无已验证榜单</p><p className="mt-2 text-xs leading-5 text-muted">没有真实资源或真实封面的候选不会展示。</p></div>}
    </section>)}
  </div>;
}
