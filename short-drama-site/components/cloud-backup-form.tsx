"use client";

import { useState } from "react";
import { CheckCircle, CloudArrowUp, X } from "@phosphor-icons/react";
import type { CloudSource, CloudType } from "@/lib/types";

function cloudName(type: CloudType) {
  return type === "baidu" ? "百度网盘" : "夸克网盘";
}

function cloudActionName(type: CloudType, compact: boolean) {
  if (!compact) return cloudName(type);
  return type === "baidu" ? "Baidu Cloud" : "Quark Cloud";
}

export function CloudBackupForm({ dramaId, platform, onSaved, compact = false }: { dramaId?: string; platform?: string; onSaved?: (resource: CloudSource) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cloudType, setCloudType] = useState<CloudType>("baidu");
  const [cloudUrl, setCloudUrl] = useState("");
  const [episode, setEpisode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<CloudSource | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          cloudUrl,
          episode: episode ? Number(episode) : undefined,
        }),
      });
      const payload = await response.json() as { resource?: CloudSource; error?: string };
      if (!response.ok || !payload.resource) throw new Error(payload.error ?? "保存失败");
      setSaved(payload.resource);
      setCloudUrl("");
      setEpisode("");
      onSaved?.(payload.resource);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const openFor = (type: CloudType) => {
    setCloudType(type);
    setOpen(true);
  };

  return <div id="cloud-backup" className="surface rounded-xl border line p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{compact ? "Cloud Player" : "云盘备份"}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">{compact ? "Save a Baidu or Quark cloud link for stable viewing." : "保存你自己的百度网盘或夸克网盘观看入口。DramaSeek 只记录链接，不下载、不转存、不处理字幕。"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openFor("baidu")} className="focus-ring accent-bg pressable inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold">
          <CloudArrowUp size={16}/>{compact ? "Save to Baidu Cloud" : "备份到百度网盘"}
        </button>
        <button onClick={() => openFor("quark")} className="focus-ring pressable inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-xs font-semibold">
          <CloudArrowUp size={16}/>{compact ? "Save to Quark Cloud" : "备份到夸克网盘"}
        </button>
        {open && <button aria-label="收起云盘备份表单" onClick={() => setOpen(false)} className="focus-ring pressable grid min-h-10 w-10 place-items-center rounded-lg border line"><X size={15}/></button>}
      </div>
    </div>
    {open && <form onSubmit={submit} className="mt-4 grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_120px]">
        <label className="grid gap-1.5 text-xs font-medium">{compact ? "Cloud type" : "云盘类型"}
          <select value={cloudType} onChange={(event) => setCloudType(event.target.value as CloudType)} className="focus-ring surface-strong min-h-10 rounded-lg border line px-3">
            <option value="baidu">{cloudActionName("baidu", compact)}</option>
            <option value="quark">{cloudActionName("quark", compact)}</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium">{compact ? "Cloud URL" : "云盘链接"}
          <input required type="url" value={cloudUrl} onChange={(event) => setCloudUrl(event.target.value)} placeholder="https://pan.baidu.com/..." className="focus-ring surface-strong min-h-10 rounded-lg border line px-3"/>
        </label>
        <label className="grid gap-1.5 text-xs font-medium">{compact ? "Episode" : "集数"}
          <input inputMode="numeric" value={episode} onChange={(event) => setEpisode(event.target.value)} placeholder={compact ? "Optional" : "可选"} className="focus-ring surface-strong min-h-10 rounded-lg border line px-3"/>
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
      {saved && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <span className="inline-flex items-center gap-1.5 font-semibold"><CheckCircle size={15} weight="fill"/>已保存：{cloudName(saved.cloudType)}</span>
        <a href={saved.cloudUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">打开观看</a>
      </div>}
      <button disabled={saving} className="focus-ring pressable justify-self-start rounded-lg border line px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">{saving ? (compact ? "Saving..." : "保存中...") : compact ? `Save to ${cloudActionName(cloudType, true)}` : `保存到 ${cloudName(cloudType)}`}</button>
    </form>}
  </div>;
}
