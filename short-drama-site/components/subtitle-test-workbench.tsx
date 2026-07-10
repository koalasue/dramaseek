"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { VideoSubtitleEnhancer } from "@/components/video-subtitle-enhancer";

type TestCue = {
  start: string;
  end: string;
  original: string;
  translated: string;
  confidence: string;
  latency: string;
  source: string;
};

const sampleRows: TestCue[] = [
  { start: "00:01.20", end: "00:03.80", original: "Waiting for ASR result…", translated: "等待语音识别结果…", confidence: "-", latency: "-", source: "captions → audio → OCR" },
];

export function SubtitleTestWorkbench() {
  const [objectUrl, setObjectUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const rows = useMemo(() => sampleRows, []);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  return <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,560px)_1fr]">
    <div className="surface overflow-hidden rounded-xl border line">
      <div className="border-b line p-4">
        <h2 className="text-base font-semibold">上传 30 秒测试视频</h2>
        <p className="mt-1 text-xs leading-5 text-muted">用于快速测试字幕 Overlay、音频识别入口和翻译显示。请使用你有权测试的视频文件。</p>
      </div>
      <div className="p-4">
        <label className="focus-ring flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-8 text-center">
          <UploadSimple size={28} className="accent"/>
          <span className="mt-2 text-sm font-semibold">选择视频文件</span>
          <span className="mt-1 text-xs text-muted">建议 MP4 / WebM，30 秒以内</span>
          <input type="file" accept="video/*" className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setObjectUrl(URL.createObjectURL(file));
            setFileName(file.name);
            setDuration(null);
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
      <p className="mt-1 text-xs leading-5 text-muted">目标输出字段：Original Text、Translated Text、Timestamp、Confidence、Latency。当前浏览器端实时字幕会直接覆盖在视频上方，表格作为测试规范和后续缓存接口的对照。</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-muted"><tr className="border-b line"><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Original Text</th><th className="py-2 pr-3">Translated Text</th><th className="py-2 pr-3">Confidence</th><th className="py-2 pr-3">Latency</th><th className="py-2">Source</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.start} className="border-b line last:border-0"><td className="whitespace-nowrap py-2 pr-3">{row.start} - {row.end}</td><td className="py-2 pr-3">{row.original}</td><td className="py-2 pr-3 font-medium">{row.translated}</td><td className="py-2 pr-3">{row.confidence}</td><td className="py-2 pr-3">{row.latency}</td><td className="py-2">{row.source}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl bg-[color:var(--surface-strong)] p-3 text-xs leading-5 text-muted">
        推荐 Pipeline：视频字幕轨 → Whisper ASR 音频识别 → NLLW 翻译 → 字幕 Overlay。OCR 只作为备用，避免把水印、Logo、片尾 “Thanks for watching” 当成对白。
      </div>
    </div>
  </section>;
}
