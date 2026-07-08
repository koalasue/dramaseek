"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { WatchToolbar, type WatchEpisode } from "@/components/watch-toolbar";

function embedUrl(value: string) {
  const url = new URL(value);
  if (url.hostname.endsWith("netshort.com") && url.pathname.startsWith("/full-episodes/")) return `${url.origin}${url.pathname.replace("/full-episodes/", "/episode/")}`;
  if (url.hostname.endsWith("dailymotion.com")) { const id = url.pathname.match(/\/video\/([^_/?]+)/)?.[1]; if (id) return `https://www.dailymotion.com/embed/video/${id}`; }
  if (url.hostname.endsWith("youtube.com")) { const id = url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([^/?]+)/)?.[1]; if (id) return `https://www.youtube.com/embed/${id}`; }
  if (url.hostname === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
  return value;
}

export function WatchExperience({ initialUrl, title }: { initialUrl: string; title: string }) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [episodes, setEpisodes] = useState<WatchEpisode[]>([{ id: "current", label: "当前资源 / 全集", url: initialUrl, downloadable: false }]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setUnavailable(null);
    try {
      const response = await fetch(`/api/episodes?url=${encodeURIComponent(initialUrl)}`);
      const result = await response.json() as { episodes?: WatchEpisode[]; unavailable?: boolean; reason?: string };
      if (result.unavailable) setUnavailable(result.reason ?? "该视频已失效");
      else if (result.episodes?.length) setEpisodes(result.episodes);
    } catch { /* 保留当前资源，让官方播放器决定是否可播放 */ }
    finally { setLoading(false); }
  }, [initialUrl]);
  useEffect(() => { void load(); }, [load]);

  if (unavailable) return <div className="surface mx-auto max-w-xl rounded-2xl border line p-7 text-center"><WarningCircle size={34} className="mx-auto text-muted"/><h2 className="mt-4 text-lg font-semibold">视频暂时无法播放</h2><p className="mt-2 text-sm text-muted">{unavailable}</p><div className="mt-5 flex justify-center gap-3"><button onClick={() => void load()} className="focus-ring pressable inline-flex min-h-11 items-center gap-2 rounded-xl border line px-4 text-sm font-medium"><ArrowClockwise size={17}/>重新检测</button><a href={initialUrl} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">前往官方页面</a></div></div>;

  return <>
    <div className="relative mx-auto aspect-[9/16] max-h-[78vh] w-full max-w-[560px] overflow-hidden rounded-2xl bg-black shadow-2xl">
      <iframe key={currentUrl} data-video-frame src={embedUrl(currentUrl)} title={title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0"/>
    </div>
    <WatchToolbar episodes={episodes} activeUrl={currentUrl} loading={loading} onSelect={(episode) => setCurrentUrl(episode.url)} />
  </>;
}
