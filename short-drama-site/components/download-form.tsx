"use client";

import { FormEvent, useState } from "react";
import { CheckCircle, DownloadSimple, FileVideo, ShieldCheck, WarningCircle } from "@phosphor-icons/react";

type Inspection = { filename: string; contentType: string; contentLength?: number; downloadUrl: string };

export function DownloadForm({ configuredHosts }: { configuredHosts: string[] }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [inspection, setInspection] = useState<Inspection | null>(null);
  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setInspection(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/downloads/inspect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: form.get("url"), ownershipConfirmed: form.get("ownership") === "on" }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "检查失败"); setInspection(payload);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "检查失败"); } finally { setLoading(false); }
  }
  const size = inspection?.contentLength ? `${(inspection.contentLength / 1024 / 1024).toFixed(1)} MB` : "大小未知";
  return <div className="grid gap-5">
    <form onSubmit={inspect} className="surface rounded-2xl border line p-5 md:p-7">
      <label className="grid gap-2 text-sm font-medium">视频文件直链<span className="text-xs font-normal leading-5 text-muted">仅支持白名单域名上的 MP4、WebM、MOV 或 M4V 文件，不支持网页地址。</span><input required name="url" type="url" placeholder="https://media.example.com/my-video.mp4" className="focus-ring surface-strong rounded-xl border line px-4 py-3 placeholder:text-[color:var(--muted)]" /></label>
      <label className="mt-5 flex items-start gap-3 text-sm leading-6"><input required name="ownership" type="checkbox" className="focus-ring mt-1 size-4 accent-[color:var(--accent)]"/><span>我确认自己拥有该视频，或已取得下载和保存授权。</span></label>
      {error && <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"><WarningCircle size={19} weight="fill" className="shrink-0"/>{error}</p>}
      <button disabled={loading || !configuredHosts.length} className="focus-ring accent-bg pressable mt-6 inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={19}/>{loading ? "正在检查" : "检查文件"}</button>
    </form>
    {!configuredHosts.length && <div className="surface rounded-2xl border line p-5 text-sm leading-6"><p className="font-semibold">下载功能尚未启用</p><p className="mt-2 text-muted">请在环境变量 <code>AUTHORIZED_DOWNLOAD_HOSTS</code> 中填写你拥有授权的媒体域名，多个域名用英文逗号分隔。</p></div>}
    {inspection && <section className="surface rounded-2xl border line p-5 md:p-7"><div className="flex items-start gap-4"><span className="surface-strong grid size-12 shrink-0 place-items-center rounded-xl"><FileVideo size={24}/></span><div className="min-w-0"><p className="flex items-center gap-2 text-sm text-muted"><CheckCircle size={17} weight="fill" className="text-emerald-600"/>检查通过</p><h2 className="mt-2 truncate text-lg font-semibold">{inspection.filename}</h2><p className="mt-1 text-sm text-muted">{inspection.contentType} / {size}</p></div></div><a href={inspection.downloadUrl} className="focus-ring accent-bg pressable mt-6 inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 font-semibold"><DownloadSimple size={19}/>下载文件</a></section>}
  </div>;
}
