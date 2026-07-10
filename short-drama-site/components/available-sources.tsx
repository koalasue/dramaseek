"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, PlayCircle } from "@phosphor-icons/react";
import { normalizePlayback } from "@/lib/playback";
import type { LiveSearchResponse, LiveSearchResource, Platform } from "@/lib/types";

export function AvailableSources({ title, currentUrl, platform }: { title: string; currentUrl: string; platform: Platform }) {
  const [resources, setResources] = useState<LiveSearchResource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!title.trim()) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/live-search?q=${encodeURIComponent(title.trim())}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: LiveSearchResponse) => setResources(payload.resources ?? []))
      .catch(() => setResources([]))
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [title]);

  const items = useMemo(() => {
    const map = new Map<string, LiveSearchResource | { id: string; platformId: string; url: string; title: string; thumbnailUrl: string; uploader: string; contentType: "full_series"; verifiedOfficial: true }>();
    map.set(currentUrl, { id: "current", platformId: platform.id, url: currentUrl, title, thumbnailUrl: "", uploader: platform.name, contentType: "full_series", verifiedOfficial: true });
    resources.forEach((resource) => map.set(resource.url, resource));
    return [...map.values()].slice(0, 6);
  }, [currentUrl, platform.id, platform.name, resources, title]);

  return <section className="surface mx-auto mt-4 max-w-3xl rounded-2xl border line p-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Available Sources</h2><p className="mt-1 text-xs text-muted">{loading ? "正在检查其他观看来源…" : "不会绕过登录或会员限制，只展示官方入口状态。"}</p></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((resource) => {
        const playback = normalizePlayback(resource);
        const canWatchHere = playback.playType === "embed" && playback.status === "available";
        return <article key={resource.id} className="surface-strong rounded-xl border line p-3">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{resource.platformId}</h3><p className="mt-1 text-xs text-muted">{playback.status === "login_required" ? "需要官方账号" : playback.label} · Quality {playback.qualityScore}</p></div><span className="rounded-full bg-[color:var(--surface)] px-2 py-1 text-[11px] font-semibold">{playback.playType}</span></div>
          <Link href={canWatchHere ? `/watch?url=${encodeURIComponent(resource.url)}&title=${encodeURIComponent(title)}` : resource.url} target={canWatchHere ? undefined : "_blank"} rel={canWatchHere ? undefined : "noreferrer"} className="focus-ring pressable mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-xs font-semibold">{canWatchHere ? <PlayCircle size={15} weight="fill"/> : <ArrowSquareOut size={15}/>} {playback.status === "login_required" ? "Open Platform" : playback.label}</Link>
        </article>;
      })}
    </div>
  </section>;
}
