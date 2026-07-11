"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowSquareOut, MagnifyingGlass, Subtitles } from "@phosphor-icons/react";
import { cleanDramaTitle, shortDescription } from "@/lib/rankings/metadata";
import { normalizePlayback } from "@/lib/playback";
import type { LiveSearchResponse, LiveSearchResource } from "@/lib/types";

function subtitleState(resource: LiveSearchResource) {
  const playback = normalizePlayback(resource);
  if (playback.capability.can_generate_subtitle || playback.playType === "direct") return "Subtitle check";
  if (playback.playType === "embed") return "No subtitle control";
  return "Platform subtitle";
}

export function ResourceSearchPanel({ title, aliases }: { title: string; aliases: string[] }) {
  const [resources, setResources] = useState<LiveSearchResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const query = useMemo(() => [title, ...aliases].filter(Boolean)[0] ?? title, [aliases, title]);

  const search = async () => {
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const response = await fetch(`/api/live-search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("资源搜索暂时失败");
      const payload = await response.json() as LiveSearchResponse;
      setResources(payload.resources ?? []);
    } catch (reason) {
      setResources([]);
      setError(reason instanceof Error ? reason.message : "资源搜索暂时失败");
    } finally {
      setLoading(false);
    }
  };

  return <section id="resource-search" className="surface scroll-mt-20 rounded-xl border line p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">资源搜索</h2>
        <p className="mt-1 text-xs leading-5 text-muted">搜索 YouTube、Dailymotion、官方平台和公开网页资源。</p>
      </div>
      <button onClick={() => void search()} disabled={loading} className="focus-ring accent-bg pressable inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
        <MagnifyingGlass size={17}/>{loading ? "Searching..." : "Search Resource"}
      </button>
    </div>

    {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
    {loading && <div className="mt-3 grid gap-2 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-[color:var(--surface-strong)]"/>)}</div>}
    {!loading && searched && !resources.length && <p className="mt-3 rounded-lg bg-[color:var(--surface-strong)] px-3 py-4 text-sm text-muted">暂未找到通过正片筛选的资源。可以换别名搜索，或使用平台外部搜索入口。</p>}
    {!!resources.length && <div className="mt-3 grid gap-2 md:grid-cols-2">
      {resources.slice(0, 12).map((resource) => {
        const cleaned = cleanDramaTitle(resource.title);
        const playback = normalizePlayback(resource);
        return <article key={resource.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border line p-2.5">
          <div className="relative h-28 overflow-hidden rounded-md bg-[color:var(--surface-strong)]">
            {resource.thumbnailUrl && <Image src={resource.thumbnailUrl} alt={`${cleaned} cover`} fill sizes="72px" className="object-cover"/>}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted">{resource.platformId} · {resource.contentType === "full_series" ? "Full series" : "Episode"}</p>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold">{cleaned}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{shortDescription({ title: resource.title, description: resource.description, genre: resource.genre, cleanTitle: cleaned })}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5"><Subtitles size={12}/>{subtitleState(resource)}</span>
              <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{playback.watchMode}</span>
            </div>
            <Link href={`/watch?url=${encodeURIComponent(resource.url)}&title=${encodeURIComponent(cleaned)}`} className="focus-ring mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border line px-3 text-xs font-semibold">播放<ArrowSquareOut size={14}/></Link>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
