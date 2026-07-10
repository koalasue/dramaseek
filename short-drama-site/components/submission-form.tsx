"use client";

import { FormEvent, useState } from "react";
import { CheckCircle, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";

export function SubmissionForm() {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("loading"); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "提交失败");
      setState("success"); setMessage("已进入待审核队列。审核通过前不会公开展示。"); event.currentTarget.reset();
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试"); }
  }
  return <form onSubmit={submit} className="surface rounded-2xl border line p-5 md:p-7">
    <div className="grid gap-5">
      <label className="grid gap-2 text-sm font-medium">正版/授权资源链接<span className="text-xs font-normal text-muted">支持官方平台页面、百度网盘和夸克网盘 HTTPS 页面；不接受视频文件或播放流直链。</span><input required name="url" type="url" placeholder="https://www.youtube.com/... 或 https://pan.quark.cn/..." className="focus-ring surface-strong rounded-xl border line px-4 py-3 placeholder:text-[color:var(--muted)]" /></label>
      <label className="grid gap-2 text-sm font-medium">剧名<span className="text-xs font-normal text-muted">中文名、英文名或你看到的标题都可以。</span><input name="title" maxLength={160} className="focus-ring surface-strong rounded-xl border line px-4 py-3" /></label>
      <label className="grid gap-2 text-sm font-medium">补充说明<span className="text-xs font-normal text-muted">请说明为什么它是官方、已授权来源，或你拥有该云盘资源的观看权限。</span><textarea name="note" maxLength={800} rows={4} className="focus-ring surface-strong resize-y rounded-xl border line px-4 py-3" /></label>
      <label className="grid gap-2 text-sm font-medium">联系邮箱（可选）<input name="contact" type="email" className="focus-ring surface-strong rounded-xl border line px-4 py-3" /></label>
    </div>
    {message && <p role="status" className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${state === "success" ? "bg-emerald-900/10 text-emerald-700 dark:text-emerald-300" : "bg-red-900/10 text-red-700 dark:text-red-300"}`}>{state === "success" ? <CheckCircle size={19} weight="fill"/> : <WarningCircle size={19} weight="fill"/>}{message}</p>}
    <button disabled={state === "loading"} className="focus-ring accent-bg pressable mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:opacity-60"><PaperPlaneTilt size={19}/>{state === "loading" ? "正在提交" : "提交审核"}</button>
  </form>;
}
