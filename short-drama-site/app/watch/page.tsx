import Link from "next/link";
import { ArrowSquareOut, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { validateResourceUrl } from "@/lib/url-policy";
import { normalizePlayback } from "@/lib/playback";
import { WatchExperience } from "@/components/watch-experience";
import { AvailableSources } from "@/components/available-sources";

export default async function WatchPage({ searchParams }: { searchParams: Promise<{ url?: string; title?: string }> }) {
  const params = await searchParams;
  const rawUrl = params.url ?? "";
  const validation = validateResourceUrl(rawUrl);
  if (!validation.valid) return <section className="page-shell py-16"><div className="surface mx-auto max-w-xl rounded-2xl border line p-8 text-center"><WarningCircle size={34} className="mx-auto text-muted"/><h1 className="mt-4 text-xl font-semibold">无法打开该播放地址</h1><p className="mt-2 text-sm text-muted">只允许已支持平台的官方 HTTPS 页面。</p><Link href="/" className="accent-bg mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">返回搜索</Link></div></section>;
  const platform = validation.platform;
  if (!platform) return <section className="page-shell py-16"><div className="surface mx-auto max-w-xl rounded-2xl border line p-8 text-center"><WarningCircle size={34} className="mx-auto text-muted"/><h1 className="mt-4 text-xl font-semibold">无法识别播放平台</h1><p className="mt-2 text-sm text-muted">请从搜索结果或详情页重新进入播放。</p><Link href="/" className="accent-bg mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">返回搜索</Link></div></section>;
  const playback = normalizePlayback({ url: rawUrl, platformId: platform.id, status: "active" });
  if (playback.playType === "cloud") {
    return <section className="page-shell py-6 md:py-10">
      <div className="surface mx-auto max-w-3xl rounded-2xl border line p-5 md:p-7">
        <p className="text-xs font-semibold text-muted">Cloud Drive Watch · {platform.name}</p>
        <h1 className="mt-2 text-xl font-semibold">{params.title || "云盘短剧"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">云盘模式适合作为 AI 字幕增强入口。第一阶段不会绕过网盘登录、提取码或会员权限；请在你拥有访问权限的云盘页面中播放或下载到本机后，再进行字幕生成与缓存。</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-[color:var(--surface-strong)] p-3"><p className="text-xs text-muted">观看方式</p><p className="mt-1 font-semibold">{playback.watchMode}</p></div>
          <div className="rounded-xl bg-[color:var(--surface-strong)] p-3"><p className="text-xs text-muted">Subtitle Support</p><p className="mt-1 font-semibold">{"★".repeat(playback.aiSubtitle.stars)}{"☆".repeat(5 - playback.aiSubtitle.stars)}</p></div>
          <div className="rounded-xl bg-[color:var(--surface-strong)] p-3"><p className="text-xs text-muted">状态</p><p className="mt-1 font-semibold">待授权访问</p></div>
        </div>
        <div className="mt-5 rounded-xl border line p-4">
          <h2 className="text-sm font-semibold">字幕流程</h2>
          <p className="mt-2 text-xs leading-5 text-muted">Cloud Video → Audio Extraction → Whisper ASR → Translation → Subtitle Cache。后续接入云盘授权或本地上传后，可以生成中文、英文、双语字幕。</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg pressable inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">打开云盘<ArrowSquareOut size={16}/></a>
          <Link href="/submit" className="focus-ring pressable inline-flex items-center gap-2 rounded-xl border line px-4 py-2.5 text-sm font-semibold">提交/更新云盘来源</Link>
        </div>
      </div>
    </section>;
  }
  return <section className="page-shell py-6 md:py-10">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted">正在播放 · {playback.watchMode} · {playback.label} · {playback.aiSubtitle.label}</p><h1 className="mt-1 text-lg font-semibold">{params.title || "海外短剧"}</h1><p className="mt-1 max-w-xl text-xs leading-5 text-muted">{playback.aiSubtitle.description}</p></div><a href={rawUrl} target="_blank" rel="noopener noreferrer" className="focus-ring pressable inline-flex items-center gap-2 rounded-xl border line px-4 py-2.5 text-sm font-medium">在官方平台打开<ArrowSquareOut size={16}/></a></div>
    <WatchExperience initialUrl={rawUrl} title={params.title || "短剧播放器"} />
    <AvailableSources title={params.title || "海外短剧"} currentUrl={rawUrl} platform={platform} />
    <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-5 text-muted">字幕按钮会根据播放源能力选择方案。站内 direct 视频可直接生成 AI 字幕；外部 iframe 受浏览器限制时会提示 External Source Limited，请切换支持网页 AI 字幕的来源或使用桌面浏览器扩展。</p>
  </section>;
}
