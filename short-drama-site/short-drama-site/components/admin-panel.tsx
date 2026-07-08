"use client";

import { FormEvent, useState } from "react";
import { ArrowClockwise, Check, SignOut, X } from "@phosphor-icons/react";
import type { Submission } from "@/lib/types";

export function AdminLogin() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const password = new FormData(event.currentTarget).get("password"); const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); if (response.ok) window.location.reload(); else { setError("密码不正确"); setLoading(false); } }
  return <form onSubmit={login} className="surface mx-auto mt-14 max-w-md rounded-2xl border line p-6"><h1 className="text-2xl font-semibold">管理员登录</h1><p className="mt-2 text-sm text-muted">审核和下架操作仅对管理员开放。</p><label className="mt-6 grid gap-2 text-sm font-medium">管理密码<input name="password" type="password" required className="focus-ring surface-strong rounded-xl border line px-4 py-3" /></label>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button disabled={loading} className="focus-ring accent-bg mt-5 w-full rounded-xl px-5 py-3 font-semibold">{loading ? "正在登录" : "登录"}</button></form>;
}

export function AdminPanel({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions); const [syncing, setSyncing] = useState(false);
  async function review(id: string, status: "approved" | "rejected") { const response = await fetch(`/api/admin/submissions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }); if (response.ok) setSubmissions((items) => items.map((item) => item.id === id ? { ...item, status } : item)); }
  async function sync() { setSyncing(true); await fetch("/api/cron/sync"); setSyncing(false); }
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.reload(); }
  return <div><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight md:text-5xl">审核队列</h1><p className="mt-2 text-muted">核对发布账号和来源证明后再公开。</p></div><div className="flex gap-2"><button onClick={sync} className="focus-ring pressable flex items-center gap-2 rounded-xl border line px-4 py-3 text-sm font-medium"><ArrowClockwise className={syncing ? "animate-spin" : ""} size={18}/>{syncing ? "同步中" : "同步来源"}</button><button onClick={logout} className="focus-ring pressable rounded-xl border line p-3" aria-label="退出登录"><SignOut size={19}/></button></div></div>
    <div className="mt-8 grid gap-4">{submissions.map((item) => <article key={item.id} className="surface rounded-2xl border line p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="font-semibold">{item.title || "未填写剧名"}</p><a className="mt-2 block truncate text-sm accent" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>{item.note && <p className="mt-3 text-sm leading-6 text-muted">{item.note}</p>}<p className="mt-3 text-xs text-muted">提交于 {new Date(item.createdAt).toLocaleString("zh-CN")} / 状态：{item.status}</p></div>{item.status === "pending" && <div className="flex gap-2"><button onClick={() => review(item.id, "approved")} className="focus-ring pressable flex items-center gap-1 rounded-xl border line px-3 py-2 text-sm"><Check size={17}/>通过</button><button onClick={() => review(item.id, "rejected")} className="focus-ring pressable flex items-center gap-1 rounded-xl border line px-3 py-2 text-sm"><X size={17}/>拒绝</button></div>}</div></article>)}{!submissions.length && <div className="surface rounded-2xl border line p-12 text-center text-muted">当前没有待审核提交。</div>}</div>
  </div>;
}
