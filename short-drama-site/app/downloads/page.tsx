import Link from "next/link";
import { DownloadTaskPanel } from "@/components/download-task-panel";

export default function DownloadsPage() {
  return <section className="page-shell py-6 md:py-10">
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">Personal Backup</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.03em]">下载资源</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">用 yt-dlp 解析 YouTube / Dailymotion 公开视频信息，方便个人授权资源备份。DramaSeek 不提供公共分享、不绕过登录、付费墙或 DRM。</p>
        </div>
        <Link href="/library" className="focus-ring rounded-xl border line px-4 py-2.5 text-sm font-semibold">My Library</Link>
      </div>
      <DownloadTaskPanel />
    </div>
  </section>;
}
