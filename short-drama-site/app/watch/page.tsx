import Link from "next/link";
import { ArrowSquareOut, Cloud, MonitorPlay, Subtitles, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { validateResourceUrl } from "@/lib/url-policy";
import { normalizePlayback } from "@/lib/playback";
import { WatchExperience } from "@/components/watch-experience";
import { AvailableSources } from "@/components/available-sources";
import { CloudBackupForm } from "@/components/cloud-backup-form";
import { DownloadTaskPanel } from "@/components/download-task-panel";

function statusText(playback: ReturnType<typeof normalizePlayback>) {
  if (playback.playType === "cloud") return "已备份";
  if (playback.playType === "external" || playback.status === "login_required") return "需要平台账号";
  return "可直接观看";
}

function modeClasses(active: boolean) {
  return `rounded-xl border p-3 ${active ? "accent-bg border-transparent" : "surface line"}`;
}

function subtitleParam(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();
    if (url.protocol === "https:" && (pathname.endsWith(".vtt") || pathname.endsWith(".srt"))) return url.href;
  } catch {
    return undefined;
  }
  return undefined;
}

export default async function WatchPage({ searchParams }: { searchParams: Promise<{ url?: string; title?: string; subtitle?: string }> }) {
  const params = await searchParams;
  const rawUrl = params.url ?? "";
  const validation = validateResourceUrl(rawUrl);
  if (!validation.valid) return <section className="page-shell py-16"><div className="surface mx-auto max-w-xl rounded-2xl border line p-8 text-center"><WarningCircle size={34} className="mx-auto text-muted"/><h1 className="mt-4 text-xl font-semibold">无法打开该观看地址</h1><p className="mt-2 text-sm text-muted">只允许已支持平台或云盘的 HTTPS 页面。</p><Link href="/" className="accent-bg mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">返回搜索</Link></div></section>;
  const platform = validation.platform;
  if (!platform) return <section className="page-shell py-16"><div className="surface mx-auto max-w-xl rounded-2xl border line p-8 text-center"><WarningCircle size={34} className="mx-auto text-muted"/><h1 className="mt-4 text-xl font-semibold">无法识别观看来源</h1><p className="mt-2 text-sm text-muted">请从搜索结果或详情页重新进入。</p><Link href="/" className="accent-bg mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">返回搜索</Link></div></section>;
  const playback = normalizePlayback({ url: rawUrl, platformId: platform.id, status: "active" });
  if (playback.playType === "cloud") {
    return <section className="page-shell py-6 md:py-10">
      <div className="surface mx-auto max-w-3xl rounded-2xl border line p-5 md:p-7">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><Cloud size={15}/>云盘备份 · {platform.name}</p>
        <h1 className="mt-2 text-xl font-semibold">{params.title || "云盘短剧"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">云盘模式用于长期保存和个人观看。DramaSeek 只记录你的个人云盘入口，不下载、不转存、不生成字幕。</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-[color:var(--surface-strong)] p-3"><p className="text-xs text-muted">观看方式</p><p className="mt-1 font-semibold">☁ {platform.name}</p></div>
          <div className="rounded-xl bg-[color:var(--surface-strong)] p-3"><p className="text-xs text-muted">状态</p><p className="mt-1 font-semibold">已备份</p></div>
          <div className="rounded-xl bg-[color:var(--surface-strong)] p-3"><p className="text-xs text-muted">字幕</p><p className="mt-1 font-semibold">交给网盘播放器</p></div>
        </div>
        <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg pressable mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">打开观看<ArrowSquareOut size={16}/></a>
      </div>
    </section>;
  }
  const isOnline = playback.playType === "direct" || playback.playType === "embed";
  const capability = playback.capability;
  const controllable = playback.playType === "direct";
  const subtitleUrl = subtitleParam(params.subtitle);
  return <section className="page-shell py-6 md:py-10">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted"><MonitorPlay size={15}/>{isOnline ? "Online Player" : "External Platform"} · {statusText(playback)}</p>
        <h1 className="mt-1 text-lg font-semibold">{params.title || "海外短剧"}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="#cloud-backup" className="focus-ring accent-bg pressable inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"><Cloud size={16}/>记录云盘链接</a>
        <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="focus-ring pressable inline-flex items-center gap-2 rounded-xl border line px-4 py-2.5 text-sm font-medium">打开原始页面<ArrowSquareOut size={16}/></a>
      </div>
    </div>

    <section aria-label="观看方式" className="surface mx-auto mb-4 max-w-3xl rounded-2xl border line p-4 md:p-5">
      <h2 className="text-sm font-semibold">观看方式</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className={modeClasses(isOnline)}>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold"><MonitorPlay size={17}/>Online Player</p>
          <p className={`mt-1 text-xs leading-5 ${isOnline ? "text-white/85" : "text-muted"}`}>{isOnline ? "Available" : "External only"}</p>
        </div>
        <div className={modeClasses(controllable)}>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold"><Subtitles size={17}/>Subtitle</p>
          <p className={`mt-1 text-xs leading-5 ${controllable ? "text-white/85" : "text-muted"}`}>{controllable ? "Auto check" : "Unavailable in iframe"}</p>
        </div>
        <a href="#cloud-backup" className={modeClasses(false)}>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold"><Cloud size={17}/>Cloud Player</p>
          <p className="mt-1 text-xs leading-5 text-muted">Cloud subtitle supported</p>
        </a>
      </div>
    </section>
    {isOnline ? <WatchExperience initialUrl={rawUrl} title={params.title || "短剧播放器"} controllable={controllable} subtitleUrl={subtitleUrl} /> : <div className="surface mx-auto max-w-xl rounded-2xl border line p-7 text-center"><h2 className="text-lg font-semibold">需要前往官方平台观看</h2><p className="mt-2 text-sm text-muted">该平台通常需要账号、地区或会员权限。DramaSeek 只提供入口和云盘备用管理。</p><a href={rawUrl} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg mt-5 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">打开官方平台</a></div>}
    {!controllable && <p className="mx-auto mt-3 max-w-3xl rounded-xl bg-[color:var(--surface-strong)] px-3 py-2 text-xs leading-5 text-muted">{capability.reason} 字幕不可用时，建议使用 Cloud Player。</p>}
    <div className="mx-auto mt-4 max-w-3xl">
      <DownloadTaskPanel compact initialUrl={rawUrl} />
    </div>
    <div className="mx-auto mt-4 max-w-3xl">
      <CloudBackupForm compact platform={platform.id} sourceUrl={rawUrl} />
    </div>
    <AvailableSources title={params.title || "海外短剧"} currentUrl={rawUrl} platform={platform} />
  </section>;
}
