"use client";

import { ListChecks, SlidersHorizontal } from "@phosphor-icons/react";

export interface WatchEpisode { id: string; label: string; url: string; downloadable: boolean }

export function WatchToolbar({ episodes, activeUrl, loading, onSelect, platformControlled = true, subtitleMode = "external" }: { episodes: WatchEpisode[]; activeUrl: string; loading?: boolean; onSelect: (episode: WatchEpisode) => void; platformControlled?: boolean; subtitleMode?: "native" | "external" }) {
  return <section aria-label="播放工具" className="surface mx-auto mt-4 max-w-3xl rounded-2xl border line p-4 md:p-5">
    <div className="grid gap-5 md:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)]">
      <label className="grid content-start gap-2 text-sm font-medium">
        <span className="inline-flex items-center gap-2"><SlidersHorizontal size={18}/>清晰度</span>
        <select disabled={platformControlled} className="surface-strong min-h-11 rounded-xl border line px-3 disabled:cursor-not-allowed disabled:opacity-70">
          <option>{platformControlled ? "由官方播放器控制" : "自动"}</option>
          <option>1080P</option>
          <option>720P</option>
          <option>480P</option>
        </select>
      </label>
      <div>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium"><ListChecks size={18}/>剧集{loading && <span className="text-xs font-normal text-muted">正在识别…</span>}</p>
        </div>
        <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto py-1">
          {episodes.map((episode) => <button key={episode.id} onClick={() => onSelect(episode)} aria-current={episode.url === activeUrl ? "true" : undefined} className={`focus-ring pressable min-h-11 rounded-xl border px-3 text-sm font-medium ${episode.url === activeUrl ? "accent-bg border-transparent" : "surface-strong line"}`}>{episode.label}</button>)}
        </div>
      </div>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">{subtitleMode === "native" ? "当前为可控视频源，会优先使用视频自带字幕轨或传入的 VTT/SRT 字幕。" : "当前为第三方播放器预览，字幕不可读取时请使用云盘备用入口。"}</p>
  </section>;
}
