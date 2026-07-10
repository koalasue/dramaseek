"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowClockwise, Check, LinkSimple, Pulse, ShieldCheck, SignOut, UploadSimple, X } from "@phosphor-icons/react";
import type { PersonalAccountConnection, PersonalAccountConnectionMode, PersonalAccountPlatform, Submission } from "@/lib/types";

export function AdminLogin() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const password = new FormData(event.currentTarget).get("password"); const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); if (response.ok) window.location.reload(); else { setError("密码不正确"); setLoading(false); } }
  return <form onSubmit={login} className="surface mx-auto mt-14 max-w-md rounded-2xl border line p-6"><h1 className="text-2xl font-semibold">管理员登录</h1><p className="mt-2 text-sm text-muted">审核和下架操作仅对管理员开放。</p><label className="mt-6 grid gap-2 text-sm font-medium">管理密码<input name="password" type="password" required className="focus-ring surface-strong rounded-xl border line px-4 py-3" /></label>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button disabled={loading} className="focus-ring accent-bg mt-5 w-full rounded-xl px-5 py-3 font-semibold">{loading ? "正在登录" : "登录"}</button></form>;
}

export function AdminPanel({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions); const [syncing, setSyncing] = useState(false); const [diagnostics, setDiagnostics] = useState(""); const [importText, setImportText] = useState(""); const [importResult, setImportResult] = useState("");
  async function review(id: string, status: "approved" | "rejected") { const response = await fetch(`/api/admin/submissions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }); if (response.ok) setSubmissions((items) => items.map((item) => item.id === id ? { ...item, status } : item)); }
  async function sync() { setSyncing(true); await fetch("/api/cron/sync"); setSyncing(false); }
  async function checkDiagnostics() { const response = await fetch("/api/admin/diagnostics", { cache: "no-store" }); setDiagnostics(JSON.stringify(await response.json(), null, 2)); }
  async function importItems() { setImportResult(""); const parsed = JSON.parse(importText); const response = await fetch("/api/admin/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed) }); const result = await response.json(); setImportResult(JSON.stringify(result, null, 2)); if (response.ok) window.setTimeout(() => window.location.reload(), 800); }
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.reload(); }
  return <div><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight md:text-5xl">审核队列</h1><p className="mt-2 text-muted">核对发布账号和来源证明后再公开。</p></div><div className="flex gap-2"><button onClick={sync} className="focus-ring pressable flex items-center gap-2 rounded-xl border line px-4 py-3 text-sm font-medium"><ArrowClockwise className={syncing ? "animate-spin" : ""} size={18}/>{syncing ? "同步中" : "同步来源"}</button><button onClick={logout} className="focus-ring pressable rounded-xl border line p-3" aria-label="退出登录"><SignOut size={19}/></button></div></div>
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="grid gap-4"><PersonalAccountsPanel />{submissions.map((item) => <article key={item.id} className="surface rounded-2xl border line p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="font-semibold">{item.title || "未填写剧名"}</p><a className="mt-2 block truncate text-sm accent" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>{item.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{item.note}</p>}<p className="mt-3 text-xs text-muted">提交于 {new Date(item.createdAt).toLocaleString("zh-CN")} / 状态：{item.status}</p></div>{item.status === "pending" && <div className="flex gap-2"><button onClick={() => review(item.id, "approved")} className="focus-ring pressable flex items-center gap-1 rounded-xl border line px-3 py-2 text-sm"><Check size={17}/>通过</button><button onClick={() => review(item.id, "rejected")} className="focus-ring pressable flex items-center gap-1 rounded-xl border line px-3 py-2 text-sm"><X size={17}/>拒绝</button></div>}</div></article>)}{!submissions.length && <div className="surface rounded-2xl border line p-12 text-center text-muted">当前没有待审核提交。</div>}</div>
      <aside className="grid content-start gap-4"><section className="surface rounded-2xl border line p-5"><h2 className="font-semibold">平台诊断</h2><p className="mt-2 text-sm leading-6 text-muted">检查 YouTube、SerpAPI、Firecrawl 等线上数据源是否可用。</p><button onClick={checkDiagnostics} className="focus-ring pressable mt-4 inline-flex items-center gap-2 rounded-xl border line px-4 py-3 text-sm font-medium"><Pulse size={17}/>检查状态</button>{diagnostics && <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-[color:var(--surface-strong)] p-3 text-xs">{diagnostics}</pre>}</section>
        <section className="surface rounded-2xl border line p-5"><h2 className="font-semibold">导入采集结果</h2><p className="mt-2 text-sm leading-6 text-muted">粘贴 Agent-Reach 或手动整理的 JSON，导入后会进入待审核，不会直接公开。</p><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder='[{"title":"The Lion&apos;s Captive","url":"https://netshort.com/full-episodes/...","platform":"NetShort"}]' className="focus-ring mt-4 min-h-44 w-full rounded-xl border line bg-transparent p-3 text-xs outline-none"/><button onClick={() => void importItems()} disabled={!importText.trim()} className="focus-ring accent-bg pressable mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"><UploadSimple size={17}/>导入待审核</button>{importResult && <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-[color:var(--surface-strong)] p-3 text-xs">{importResult}</pre>}</section></aside>
    </div>
  </div>;
}

const personalPlatforms: Array<{ id: PersonalAccountPlatform; name: string }> = [
  { id: "reelshort", name: "ReelShort" },
  { id: "dramabox", name: "DramaBox" },
  { id: "shortmax", name: "ShortMax" },
  { id: "goodshort", name: "GoodShort" },
  { id: "flextv", name: "FlexTV" },
  { id: "netshort", name: "NetShort" },
  { id: "tiktok", name: "TikTok" },
];

function modeLabel(mode: PersonalAccountConnectionMode) {
  if (mode === "guest") return "游客模式";
  if (mode === "personal_account") return "个人账号";
  return "手动同步";
}

function statusLabel(status: PersonalAccountConnection["status"]) {
  if (status === "connected") return "已连接";
  if (status === "expired") return "已过期";
  if (status === "needs_action") return "需要操作";
  if (status === "disabled") return "已停用";
  return "未连接";
}

function PersonalAccountsPanel() {
  const [connections, setConnections] = useState<PersonalAccountConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/personal-accounts", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json() as { connections?: PersonalAccountConnection[] };
      setConnections(payload.connections ?? []);
    }
    setLoading(false);
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/personal-accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platformId: form.get("platformId"),
        mode: form.get("mode"),
        accountLabel: form.get("accountLabel"),
        note: form.get("note"),
      }),
    });
    setMessage(response.ok ? "连接记录已保存。不会保存密码、Cookie 或 Token。" : "保存失败");
    await load();
  }

  async function syncAccount(id: string) {
    setMessage("");
    const response = await fetch(`/api/admin/personal-accounts/${encodeURIComponent(id)}/sync`, { method: "POST" });
    const payload = await response.json().catch(() => ({})) as { note?: string };
    setMessage(payload.note ?? (response.ok ? "同步状态已更新" : "同步失败"));
    await load();
  }

  useEffect(() => { void load(); }, []);

  return <section className="surface rounded-2xl border line p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20}/>个人账号连接</h2><p className="mt-1 text-sm leading-6 text-muted">仅用于个人同步观看入口、收藏或历史；不会公开账号内容，不下载或转存视频。</p></div>
      <button onClick={() => void load()} className="focus-ring pressable rounded-xl border line px-3 py-2 text-xs font-medium"><ArrowClockwise className={loading ? "animate-spin" : ""} size={15}/></button>
    </div>

    <form onSubmit={connect} className="mt-4 grid gap-3 rounded-xl bg-[color:var(--surface-strong)] p-3 md:grid-cols-4">
      <label className="grid gap-1 text-xs font-medium">平台<select name="platformId" className="rounded-lg border line bg-transparent px-2 py-2">{personalPlatforms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium">方式<select name="mode" className="rounded-lg border line bg-transparent px-2 py-2"><option value="guest">游客模式</option><option value="personal_account">个人账号</option><option value="manual">手动同步</option></select></label>
      <label className="grid gap-1 text-xs font-medium">账号标识<input name="accountLabel" placeholder="邮箱/昵称，可留空" className="rounded-lg border line bg-transparent px-2 py-2"/></label>
      <label className="grid gap-1 text-xs font-medium">备注<input name="note" placeholder="只记录说明，不填密码" className="rounded-lg border line bg-transparent px-2 py-2"/></label>
      <div className="md:col-span-4"><button className="focus-ring accent-bg pressable inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold"><LinkSimple size={15}/>保存连接记录</button></div>
    </form>

    {message && <p className="mt-3 rounded-xl bg-[color:var(--surface-strong)] p-3 text-xs leading-5 text-muted">{message}</p>}

    <div className="mt-4 grid gap-2">
      {connections.map((item) => <article key={item.id} className="rounded-xl border line p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{item.platformName}</h3><p className="mt-1 text-xs text-muted">{modeLabel(item.mode)} · {statusLabel(item.status)}{item.accountLabel ? ` · ${item.accountLabel}` : ""}</p></div><button onClick={() => void syncAccount(item.id)} className="focus-ring pressable rounded-lg border line px-3 py-2 text-xs font-medium">标记同步</button></div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] text-muted"><span className="rounded-lg bg-[color:var(--surface-strong)] p-2"><strong className="block text-sm text-[color:var(--ink)]">{item.syncedDramaCount}</strong>剧目</span><span className="rounded-lg bg-[color:var(--surface-strong)] p-2"><strong className="block text-sm text-[color:var(--ink)]">{item.loginRequiredCount}</strong>需登录</span><span className="rounded-lg bg-[color:var(--surface-strong)] p-2"><strong className="block text-sm text-[color:var(--ink)]">{item.privateCount}</strong>私密</span><span className="rounded-lg bg-[color:var(--surface-strong)] p-2"><strong className="block text-sm text-[color:var(--ink)]">{item.failedCount}</strong>失败</span></div>
        <p className="mt-2 text-[11px] text-muted">上次同步：{item.lastSyncTime ? new Date(item.lastSyncTime).toLocaleString("zh-CN") : "未同步"}。{item.note}</p>
      </article>)}
      {!connections.length && <div className="rounded-xl border line p-6 text-center text-sm text-muted">暂无个人账号连接。</div>}
    </div>
  </section>;
}
