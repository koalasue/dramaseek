import type { Metadata } from "next";
import { DownloadForm } from "@/components/download-form";
import { configuredDownloadHosts } from "@/lib/download-policy";
import { CoreActions } from "@/components/core-actions";

export const metadata: Metadata = { title: "授权内容下载" };
export default function DownloadsPage() {
  const hosts = configuredDownloadHosts();
  return <div className="page-shell py-8 md:py-12"><CoreActions active="downloads"/><div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[.72fr_1.28fr]"><div><h1 className="text-3xl font-semibold tracking-[-.035em] text-balance md:text-5xl">下载授权视频文件</h1><p className="mt-5 max-w-md leading-7 text-muted text-pretty">粘贴你拥有或获准下载的直接媒体链接，检查通过后即可保存到手机或电脑。</p><div className="mt-8 rounded-2xl border line p-5 text-sm leading-6 text-muted"><p className="font-semibold text-[color:var(--ink)]">安全边界</p><p className="mt-2">域名白名单、文件类型、大小限制与私网拦截均由服务端执行。网页解析、M3U8 和 DRM 内容不受支持。</p></div></div><DownloadForm configuredHosts={hosts}/></div></div>;
}
