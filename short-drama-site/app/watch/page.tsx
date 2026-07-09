import Link from "next/link";
import { ArrowSquareOut, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { validateResourceUrl } from "@/lib/url-policy";
import { WatchExperience } from "@/components/watch-experience";

export default async function WatchPage({ searchParams }: { searchParams: Promise<{ url?: string; title?: string }> }) {
  const params = await searchParams;
  const rawUrl = params.url ?? "";
  const validation = validateResourceUrl(rawUrl);
  if (!validation.valid) return <section className="page-shell py-16"><div className="surface mx-auto max-w-xl rounded-2xl border line p-8 text-center"><WarningCircle size={34} className="mx-auto text-muted"/><h1 className="mt-4 text-xl font-semibold">无法打开该播放地址</h1><p className="mt-2 text-sm text-muted">只允许已支持平台的官方 HTTPS 页面。</p><Link href="/" className="accent-bg mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">返回搜索</Link></div></section>;
  return <section className="page-shell py-6 md:py-10">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted">正在播放</p><h1 className="mt-1 text-lg font-semibold">{params.title || "海外短剧"}</h1></div><a href={rawUrl} target="_blank" rel="noopener noreferrer" className="focus-ring pressable inline-flex items-center gap-2 rounded-xl border line px-4 py-2.5 text-sm font-medium">在官方平台打开<ArrowSquareOut size={16}/></a></div>
    <WatchExperience initialUrl={rawUrl} title={params.title || "短剧播放器"} />
    <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-5 text-muted">视频出现后，画面右侧会显示“字幕”按钮。电脑请选择当前标签页并共享音频；手机浏览器会在需要时请求麦克风权限。若平台禁止嵌入，请使用上方官方入口。</p>
  </section>;
}
