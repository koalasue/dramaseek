"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, ListChecks, SlidersHorizontal, X } from "@phosphor-icons/react";

export interface WatchEpisode { id: string; label: string; url: string; downloadable: boolean }

export function WatchToolbar({ episodes, activeUrl, loading, onSelect, platformControlled = true }: { episodes: WatchEpisode[]; activeUrl: string; loading?: boolean; onSelect: (episode: WatchEpisode) => void; platformControlled?: boolean }) {
  const [downloadMode, setDownloadMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { setSelected([]); setDownloadMode(false); }, [episodes]);
  const downloadable = episodes.filter((episode) => episode.downloadable && selected.includes(episode.id));

  const downloadSelected = async () => {
    setMessage("正在检查授权文件…");
    for (const episode of downloadable) {
      const response = await fetch("/api/downloads/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: episode.url, ownershipConfirmed: true }) });
      const result = await response.json() as { downloadUrl?: string; error?: string };
      if (!response.ok || !result.downloadUrl) { setMessage(result.error ?? `${episode.label} 无法下载`); return; }
      const anchor = document.createElement("a"); anchor.href = result.downloadUrl; anchor.download = ""; anchor.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setMessage(`已开始下载 ${downloadable.length} 集`);
  };

  return <section aria-label="播放工具" className="surface mx-auto mt-4 max-w-3xl rounded-2xl border line p-4 md:p-5">
    <div className="grid gap-5 md:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)]">
      <label className="grid content-start gap-2 text-sm font-medium"><span className="inline-flex items-center gap-2"><SlidersHorizontal size={18}/>清晰度</span><select disabled={platformControlled} className="surface-strong min-h-11 rounded-xl border line px-3 disabled:cursor-not-allowed disabled:opacity-70"><option>{platformControlled ? "由官方播放器控制" : "自动"}</option><option>1080P</option><option>720P</option><option>480P</option></select></label>
      <div><div className="flex min-h-11 items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-medium"><ListChecks size={18}/>剧集{loading && <span className="text-xs font-normal text-muted">正在识别…</span>}</p><button onClick={() => { setDownloadMode((value) => !value); setSelected([]); setMessage(""); }} className="focus-ring pressable inline-flex min-h-11 items-center gap-2 rounded-xl border line px-3 text-sm font-medium">{downloadMode ? <X size={17}/> : <DownloadSimple size={17}/>} {downloadMode ? "取消" : "下载剧集"}</button></div>
        <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto py-1">{episodes.map((episode) => downloadMode ? <label key={episode.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${episode.downloadable ? "surface-strong line" : "line opacity-50"}`} title={episode.downloadable ? "选择下载" : "该集没有授权直链"}><input type="checkbox" disabled={!episode.downloadable} checked={selected.includes(episode.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, episode.id] : current.filter((id) => id !== episode.id))}/>{episode.label}</label> : <button key={episode.id} onClick={() => onSelect(episode)} aria-current={episode.url === activeUrl ? "true" : undefined} className={`focus-ring pressable min-h-11 rounded-xl border px-3 text-sm font-medium ${episode.url === activeUrl ? "accent-bg border-transparent" : "surface-strong line"}`}>{episode.label}</button>)}</div>
      </div>
    </div>
    {downloadMode && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t line pt-4"><p className="text-xs leading-5 text-muted">仅授权直接媒体文件可选；平台受保护视频不会被抓取。</p><button disabled={!downloadable.length} onClick={() => void downloadSelected()} className="focus-ring accent-bg pressable min-h-11 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">下载所选（{downloadable.length}）</button></div>}
    {!downloadMode && <p className="mt-3 text-xs leading-5 text-muted">点击集数立即切换播放；第三方平台的清晰度由官方播放器提供。</p>}
    {message && <p className="mt-2 text-xs font-medium" role="status">{message}</p>}
  </section>;
}
