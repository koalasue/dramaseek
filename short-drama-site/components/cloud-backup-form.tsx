"use client";

import { useState } from "react";
import { ArrowSquareOut, CheckCircle, CloudArrowUp, Clock, X } from "@phosphor-icons/react";
import type { CloudSource, CloudType } from "@/lib/types";

function cloudName(type: CloudType) {
  return type === "baidu" ? "百度网盘" : "夸克网盘";
}

function cloudActionName(type: CloudType, compact: boolean) {
  if (!compact) return cloudName(type);
  return type === "baidu" ? "Baidu Cloud" : "Quark Cloud";
}

const cloudHome: Record<CloudType, string> = {
  baidu: "https://pan.baidu.com/",
  quark: "https://pan.quark.cn/",
};

export function CloudBackupForm({ dramaId, platform, sourceUrl, onSaved, compact = false }: { dramaId?: string; platform?: string; sourceUrl?: string; onSaved?: (resource: CloudSource) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cloudType, setCloudType] = useState<CloudType>("baidu");
  const [cloudUrl, setCloudUrl] = useState("");
  const [episode, setEpisode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<CloudSource | null>(null);

  const saveResource = async (status: "saved" | "processing") => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/cloud-resources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dramaId,
          platform,
          cloudType,
          cloudUrl: status === "saved" ? cloudUrl : undefined,
          sourceUrl,
          status,
          episode: episode ? Number(episode) : undefined,
        }),
      });
      const payload = await response.json() as { resource?: CloudSource; error?: string };
      if (!response.ok || !payload.resource) throw new Error(payload.error ?? "保存失败");
      setSaved(payload.resource);
      if (status === "saved") setCloudUrl("");
      setEpisode("");
      onSaved?.(payload.resource);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveResource("saved");
  };

  const openFor = (type: CloudType) => {
    setCloudType(type);
    setOpen(true);
  };

  return <div id="cloud-backup" className="surface rounded-xl border line p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{compact ? "Cloud Link Manager" : "云盘链接管理"}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">{compact ? "Paste a Baidu or Quark share link after you save it manually." : "DramaSeek 不自动转存。请先在百度网盘或夸克网盘里手动保存/分享，再把云盘链接记录到这里。"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openFor("baidu")} className="focus-ring accent-bg pressable inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold">
          <CloudArrowUp size={16}/>{compact ? "Record Baidu Link" : "记录百度网盘链接"}
        </button>
        <button onClick={() => openFor("quark")} className="focus-ring pressable inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-xs font-semibold">
          <CloudArrowUp size={16}/>{compact ? "Record Quark Link" : "记录夸克网盘链接"}
        </button>
        {open && <button aria-label="收起云盘备份表单" onClick={() => setOpen(false)} className="focus-ring pressable grid min-h-10 w-10 place-items-center rounded-lg border line"><X size={15}/></button>}
      </div>
    </div>
    {open && <form onSubmit={submit} className="mt-4 grid gap-3">
      <div className="grid gap-2 rounded-lg bg-[color:var(--surface-strong)] p-3 text-xs leading-5 text-muted md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="font-semibold text-[color:var(--foreground)]">源资源无法直接保存时这样处理</p>
          <p className="mt-1">Dailymotion、YouTube、聚合站页面通常不能被百度/夸克直接转存。已有云盘分享链接就粘贴记录；没有链接时先标记为待补，后续再寻找或手动补充云盘资源。</p>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4">打开原资源<ArrowSquareOut size={13}/></a>}
        </div>
        <a href={cloudHome[cloudType]} target="_blank" rel="noopener noreferrer" className="focus-ring pressable inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border line px-3 font-semibold text-[color:var(--foreground)]">
          打开{cloudName(cloudType)}<ArrowSquareOut size={13}/>
        </a>
      </div>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_120px]">
        <label className="grid gap-1.5 text-xs font-medium">{compact ? "Cloud type" : "云盘类型"}
          <select value={cloudType} onChange={(event) => setCloudType(event.target.value as CloudType)} className="focus-ring surface-strong min-h-10 rounded-lg border line px-3">
            <option value="baidu">{cloudActionName("baidu", compact)}</option>
            <option value="quark">{cloudActionName("quark", compact)}</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium">{compact ? "Cloud URL" : "云盘链接"}
          <input required type="url" value={cloudUrl} onChange={(event) => setCloudUrl(event.target.value)} placeholder={cloudType === "baidu" ? "https://pan.baidu.com/s/..." : "https://pan.quark.cn/s/..."} className="focus-ring surface-strong min-h-10 rounded-lg border line px-3"/>
        </label>
        <label className="grid gap-1.5 text-xs font-medium">{compact ? "Episode" : "集数"}
          <input inputMode="numeric" value={episode} onChange={(event) => setEpisode(event.target.value)} placeholder={compact ? "Optional" : "可选"} className="focus-ring surface-strong min-h-10 rounded-lg border line px-3"/>
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
      {saved && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <span className="inline-flex items-center gap-1.5 font-semibold">{saved.cloudStatus === "processing" ? <Clock size={15} weight="fill"/> : <CheckCircle size={15} weight="fill"/>}{saved.cloudStatus === "processing" ? "已标记待补：" : "已保存："}{cloudName(saved.cloudType)}</span>
        {saved.cloudStatus === "saved" && <a href={saved.cloudUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">打开观看</a>}
      </div>}
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} className="focus-ring pressable rounded-lg border line px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">{saving ? (compact ? "Saving..." : "保存中...") : compact ? `Record ${cloudActionName(cloudType, true)} Link` : `记录${cloudName(cloudType)}链接`}</button>
        <button type="button" disabled={saving} onClick={() => void saveResource("processing")} className="focus-ring pressable inline-flex items-center gap-1.5 rounded-lg border line px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><Clock size={15}/>标记待补云盘</button>
      </div>
    </form>}
  </div>;
}
