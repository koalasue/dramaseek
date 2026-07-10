"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { VideoSubtitleEnhancer } from "@/components/video-subtitle-enhancer";
import type { SubtitleCue } from "@/lib/subtitles/types";

type TestCue = {
  id: string;
  start: string;
  end: string;
  original: string;
  translated: string;
  confidence: string;
  latency: string;
  source: string;
};

function formatTime(ms: number) {
  const total = Math.max(0, ms / 1000);
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toFixed(2).padStart(5, "0");
  return `${minutes}:${seconds}`;
}

function rowFromCue(cue: SubtitleCue, sessionStartedAt: number): TestCue {
  return {
    id: cue.id,
    start: formatTime(cue.startedAt - sessionStartedAt),
    end: formatTime(cue.endedAt - sessionStartedAt),
    original: cue.originalText,
    translated: cue.translatedText,
    confidence: `${Math.round(cue.confidence * 100)}%`,
    latency: `${Math.max(0, cue.endedAt - cue.startedAt)}ms`,
    source: cue.source.toUpperCase(),
  };
}

export function SubtitleTestWorkbench() {
  const [objectUrl, setObjectUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [rows, setRows] = useState<TestCue[]>([]);
  const [status, setStatus] = useState("上传视频后，点击视频右侧字幕按钮开始识别。");
  const sessionStartedAt = useRef(Date.now());
  const newest = useMemo(() => rows[0], [rows]);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  useEffect(() => {
    const onCue = (event: Event) => {
      const cue = (event as CustomEvent<SubtitleCue>).detail;
      if (!cue?.id) return;
      setRows((items) => [rowFromCue(cue, sessionStartedAt.current), ...items.filter((item) => item.id !== cue.id)].slice(0, 30));
      setStatus(`已识别：${cue.source.toUpperCase()} · Confidence ${Math.round(cue.confidence * 100)}%`);
    };
    window.addEventListener("dramaseek:subtitle-cue", onCue);
    return () => window.removeEventListener("dramaseek:subtitle-cue", onCue);
  }, []);

  return <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,560px)_1fr]">
    <div className="surface overflow-hidden rounded-xl border line">
      <div className="border-b line p-4">
        <h2 className="text-base font-semibold">上传 30 秒测试视频</h2>
        <p className="mt-1 text-xs leading-5 text-muted">用于快速测试视频音频 ASR、翻译和字幕 Overlay。上传后播放视频，再点击右侧字幕按钮。</p>
      </div>
      <div className="p-4">
        <label className="focus-ring flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-8 text-center">
          <UploadSimple size={28} className="accent"/>
          <span className="mt-2 text-sm font-semibold">选择视频文件</span>
          <span className="mt-1 text-xs text-muted">建议 MP4 / WebM，30 秒以内，且视频里有人物对白</span>
          <input type="file" accept="video/*" className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setObjectUrl(URL.createObjectURL(file));
            setFileName(file.name);
            setDuration(null);
            setRows([]);
            sessionStartedAt.current = Date.now();
            setStatus("视频已载入。请播放视频，然后点击右侧字幕按钮开始识别。");
          }}/>
        </label>
        {objectUrl && <div className="mt-4">
          <div className="relative mx-auto aspect-[9/16] max-h-[70vh] overflow-hidden rounded-xl bg-black">
            <video src={objectUrl} controls playsInline className="h-full w-full" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} />
            <VideoSubtitleEnhancer />
          </div>
          <p className="mt-2 text-xs text-muted">{fileName}{duration ? ` · ${duration.toFixed(1)}s` : ""}{duration && duration > 30 ? " · 建议裁剪到 30 秒以内以便测试" : ""}</p>
        </div>}
      </div>
    </div>

    <div className="surface rounded-xl border line p-4">
      <h2 className="text-base font-semibold">字幕测试输出</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{status}</p>
      {newest && <div className="mt-3 rounded-xl bg-[color:var(--surface-strong)] p-3 text-sm">
        <p className="text-xs font-semibold text-muted">Latest Result</p>
        <p className="mt-2">{newest.original}</p>
        <p className="mt-1 font-semibold">{newest.translated}</p>
      </div>}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-muted"><tr className="border-b line"><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Original Text</th><th className="py-2 pr-3">Translated Text</th><th className="py-2 pr-3">Confidence</th><th className="py-2 pr-3">Latency</th><th className="py-2">Source</th></tr></thead>
          <tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-b line last:border-0"><td className="whitespace-nowrap py-2 pr-3">{row.start} - {row.end}</td><td className="py-2 pr-3">{row.original}</td><td className="py-2 pr-3 font-medium">{row.translated}</td><td className="py-2 pr-3">{row.confidence}</td><td className="py-2 pr-3">{row.latency}</td><td className="py-2">{row.source}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-muted">暂无真实识别结果。请播放视频并开启字幕。</td></tr>}</tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl bg-[color:var(--surface-strong)] p-3 text-xs leading-5 text-muted">
        如果本地上传视频仍无结果：请先点击视频播放，再点字幕按钮；外部平台视频如果浏览器无法直接读取音轨，电脑端请选择“共享当前标签页并勾选共享音频”，手机端请允许麦克风权限并调高视频音量。OCR 只作为手动备用，不会默认识别画面文字。
      </div>
    </div>
  </section>;
}
