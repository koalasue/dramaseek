"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowClockwise, CheckCircle, DownloadSimple, WarningCircle } from "@phosphor-icons/react";

type DownloadTask = {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  quality?: string;
  created_at: string;
  info?: {
    title: string;
    thumbnail?: string;
    duration?: number;
    quality?: string;
    download_url?: string;
    downloadUrl?: string;
  };
  error?: string;
};

function statusLabel(status: DownloadTask["status"]) {
  if (status === "pending") return "等待解析";
  if (status === "processing") return "解析中";
  if (status === "completed") return "已解析";
  return "解析失败";
}

export function DownloadTaskPanel({ initialUrl = "", compact = false }: { initialUrl?: string; compact?: boolean }) {
  const [url, setUrl] = useState(initialUrl);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [task, setTask] = useState<DownloadTask | null>(null);

  useEffect(() => {
    if (!task || task.status === "completed" || task.status === "failed") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/downloads/tasks/${task.id}`, { cache: "no-store" });
      const payload = await response.json() as { task?: DownloadTask };
      if (payload.task) setTask(payload.task);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [task]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/downloads/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, ownershipConfirmed }),
      });
      const payload = await response.json() as { task?: DownloadTask; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error ?? "创建下载任务失败");
      setTask(payload.task);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建下载任务失败");
    } finally {
      setLoading(false);
    }
  }

  return <section id="download-resource" className="surface rounded-xl border line p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{compact ? "Download Resource" : "下载资源"}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">使用 yt-dlp 解析 YouTube / Dailymotion 公开视频。仅限个人、已授权内容；不会绕过登录、DRM、付费墙或会员限制。</p>
      </div>
      <span className="rounded-lg bg-[color:var(--surface-strong)] px-2 py-1 text-[11px] font-semibold text-muted">yt-dlp</span>
    </div>

    <form onSubmit={submit} className="mt-4 grid gap-3">
      <label className="grid gap-1.5 text-xs font-medium">Video URL
        <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="focus-ring surface-strong min-h-10 rounded-lg border line px-3"/>
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-muted">
        <input required type="checkbox" checked={ownershipConfirmed} onChange={(event) => setOwnershipConfirmed(event.target.checked)} className="focus-ring mt-0.5 size-4 accent-[color:var(--accent)]"/>
        <span>我确认自己拥有该内容，或已取得下载/备份授权。</span>
      </label>
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"><WarningCircle size={15} weight="fill"/>{error}</p>}
      <button disabled={loading} className="focus-ring pressable justify-self-start rounded-lg border line px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? "创建中..." : "解析下载信息"}
      </button>
    </form>

    {task && <article className="mt-4 rounded-lg border line bg-[color:var(--surface-strong)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          {task.status === "completed" ? <CheckCircle size={16} weight="fill" className="text-emerald-600"/> : <ArrowClockwise size={16}/>}
          {statusLabel(task.status)}
        </p>
        <span className="text-xs text-muted">{task.progress}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
        <span className="block h-full bg-[color:var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}/>
      </div>
      {task.info && <div className="mt-3 grid gap-2 text-xs text-muted">
        <strong className="line-clamp-2 text-sm text-[color:var(--foreground)]">{task.info.title}</strong>
        <span>Quality: {task.info.quality ?? task.quality ?? "Auto"}{task.info.duration ? ` · ${Math.round(task.info.duration / 60)} min` : ""}</span>
        {(task.info.download_url || task.info.downloadUrl) && <a href={task.info.download_url || task.info.downloadUrl} target="_blank" rel="noopener noreferrer" className="focus-ring pressable inline-flex min-h-9 w-fit items-center gap-1.5 rounded-lg border line px-3 font-semibold text-[color:var(--foreground)]">
          <DownloadSimple size={15}/>打开下载地址
        </a>}
      </div>}
      {task.error && <p className="mt-2 text-xs leading-5 text-red-700">{task.error}</p>}
    </article>}
  </section>;
}
