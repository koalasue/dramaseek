import type { Metadata } from "next";
import { SubmissionForm } from "@/components/submission-form";

export const metadata: Metadata = { title: "提交资源" };
export default function SubmitPage() { return <div className="page-shell grid gap-10 py-12 md:grid-cols-[.7fr_1.3fr] md:py-20"><div><h1 className="text-4xl font-semibold tracking-[-.04em] md:text-5xl">补充一个正版入口</h1><p className="mt-5 max-w-md leading-7 text-muted">提交不会立即公开。我们会核对发布账号、平台页面和授权信息，并合并重复剧目。</p><div className="mt-8 rounded-2xl border line p-5 text-sm leading-6 text-muted"><p className="font-semibold text-[color:var(--ink)]">不会收录</p><p className="mt-2">盗版聚合站、视频文件直链、绕过付费页面、破解工具及无法证明来源的转载。</p></div></div><SubmissionForm/></div>; }
