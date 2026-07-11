import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowSquareOut, CalendarBlank, Cloud, Globe, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getDramaBySlug, listPlatforms } from "@/lib/repository";
import { normalizePlayback } from "@/lib/playback";
import { PlatformMark } from "@/components/platform-mark";
import { CloudBackupForm } from "@/components/cloud-backup-form";
import { ResourceSearchPanel } from "@/components/resource-search-panel";
import { toDramaEntity } from "@/lib/drama-entity";
import type { CloudSource } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const drama = await getDramaBySlug((await params).slug);
  return drama ? { title: drama.titleZh, description: drama.synopsis } : { title: "未找到短剧" };
}

function cloudName(source: Pick<CloudSource, "cloudType">) {
  return source.cloudType === "baidu" ? "百度网盘" : "夸克网盘";
}

function cloudStatusLabel(status: CloudSource["cloudStatus"]) {
  if (status === "saved") return "已备份";
  if (status === "processing") return "处理中";
  return "已失效";
}

export default async function DramaPage({ params }: { params: Promise<{ slug: string }> }) {
  const [drama, platforms] = await Promise.all([getDramaBySlug((await params).slug), listPlatforms()]);
  if (!drama) notFound();
  const entity = toDramaEntity(drama);

  return <div className="page-shell py-5 md:py-7">
    <Link href="/search" className="focus-ring rounded-md text-sm text-muted">返回搜索</Link>
    <section className="mt-4 grid gap-5 md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr]">
      <div className="relative mx-auto aspect-[3/4] w-[150px] overflow-hidden rounded-xl md:w-full">
        <Image src={drama.posterUrl} alt={`${drama.titleZh}海报`} fill priority sizes="(max-width:768px) 150px, 220px" className="object-cover" />
      </div>
      <div className="py-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><SealCheck size={14} weight="fill" className="accent"/>资源聚合</span>
          {drama.episodeCount && <span>{drama.episodeCount} 集</span>}
          <span>{drama.languages.map((item) => item.toUpperCase()).join(" / ")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-[-.03em] md:text-3xl">{drama.titleZh}</h1>
        <p className="mt-1 text-sm text-muted">{drama.titleEn}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{drama.synopsis}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted">
          {entity.genre.slice(0, 4).map((item) => <span key={item} className="rounded-md bg-[color:var(--surface-strong)] px-2 py-1">{item}</span>)}
          <span className="rounded-md bg-[color:var(--surface-strong)] px-2 py-1">Heat {drama.trendingScore}</span>
          <span className="rounded-md bg-[color:var(--surface-strong)] px-2 py-1">更新 {new Date(drama.updatedAt).toLocaleDateString("zh-CN")}</span>
        </div>
        {drama.aliases.length > 0 && <p className="mt-3 text-xs text-muted">别名：{drama.aliases.join("、")}</p>}

        <div className="mt-5 grid gap-4">
          <ResourceSearchPanel title={drama.titleEn || drama.titleZh} aliases={[drama.titleZh, ...drama.aliases]} />
          <CloudBackupForm dramaId={drama.id} />

          <section>
            <h2 className="text-base font-semibold">观看方式</h2>
            <div className="mt-3 grid gap-2">
              {drama.resources.map((resource) => {
                const platform = platforms.find((item) => item.id === resource.platformId);
                if (!platform) return null;
                const playback = normalizePlayback(resource);
                const isOnline = playback.playType === "direct" || playback.playType === "embed";
                const href = isOnline ? `/watch?url=${encodeURIComponent(resource.url)}&title=${encodeURIComponent(drama.titleEn || drama.titleZh)}` : resource.url;
                return <article key={resource.id} className="surface grid gap-3 rounded-xl border line p-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <PlatformMark platform={platform}/>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1"><Globe size={13}/>{resource.region} / {resource.language.toUpperCase()}</span>
                      <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{isOnline ? "▶ 在线播放" : "官方平台"}</span>
                      <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{isOnline ? "可直接观看" : "需要平台账号"}</span>
                      <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">Quality {playback.qualityScore}</span>
                      <span className="inline-flex items-center gap-1"><CalendarBlank size={13}/>检查于 {new Date(resource.checkedAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">来源证明：{resource.sourceProof}</p>
                    <p className="mt-1 text-[11px] text-muted">{isOnline ? "站内尝试在线播放；平台限制时可改用官方平台或保存到个人云盘。" : "跳转官方平台观看，不绕过登录、付费或地区限制。"}</p>
                  </div>
                  <a href={href} target={isOnline ? undefined : "_blank"} rel={isOnline ? undefined : "noopener noreferrer"} className="focus-ring accent-bg pressable inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold">
                    {isOnline ? "在线播放" : "打开官方平台"}<ArrowSquareOut size={15}/>
                  </a>
                </article>;
              })}

              {drama.cloudSources?.map((source) => <article key={source.id} className="surface grid gap-3 rounded-xl border line p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-[color:var(--surface-strong)]"><Cloud size={16}/></span>{cloudName(source)}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                    <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">☁ 云盘备份</span>
                    {source.platform && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">来源 {source.platform}</span>}
                    <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{cloudStatusLabel(source.cloudStatus)}</span>
                    {source.episode && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">第 {source.episode} 集</span>}
                    <span className="inline-flex items-center gap-1"><CalendarBlank size={13}/>保存于 {new Date(source.createdTime).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">字幕、清晰度和播放能力交给 {cloudName(source)} 自身播放器处理。</p>
                </div>
                <a href={source.cloudUrl} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg pressable inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold">
                  打开观看<ArrowSquareOut size={15}/>
                </a>
              </article>)}
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>;
}
