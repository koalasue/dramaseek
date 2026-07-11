import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cloud, ClockCounterClockwise, Fire, Star, Trophy } from "@phosphor-icons/react/dist/ssr";
import { CoreActions } from "@/components/core-actions";
import { SearchExperience } from "@/components/search-experience";
import { listCloudResources, listDramas, listPlatforms } from "@/lib/repository";
import { toDramaEntity } from "@/lib/drama-entity";

export const metadata: Metadata = { title: "海外短剧搜索引擎" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; platform?: string }> }) {
  const [{ q, platform }, dramas, platforms, cloudResources] = await Promise.all([searchParams, listDramas(), listPlatforms(), listCloudResources()]);
  const trending = [...dramas].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
  const platformPreview = platforms.slice(0, 6).map((item) => ({
    platform: item,
    dramas: dramas
      .filter((drama) => drama.resources.some((resource) => resource.platformId === item.id) || item.id === "dailymotion" || item.id === "youtube")
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 3),
  })).filter((item) => item.dramas.length);
  const backedDramaIds = new Set(cloudResources.map((item) => item.dramaId).filter(Boolean));
  const libraryCount = backedDramaIds.size;

  return <div className="page-shell py-4 md:py-6">
    <CoreActions active="search" />
    <header className="mt-5 grid gap-4 md:mt-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold text-muted"><Star size={14} weight="fill" className="accent"/>DramaSeek</p>
        <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-.03em] text-balance md:text-4xl">海外短剧搜索引擎与观看入口管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted text-pretty">搜索真实剧名，进入短剧数据库，搜索观看资源。在线播放不稳定时，保存个人云盘入口备用观看。</p>
      </div>
      <aside className="surface rounded-xl border line p-4">
        <h2 className="text-sm font-semibold">My Library</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-lg bg-[color:var(--surface-strong)] px-2 py-2"><strong className="block text-base">{dramas.length}</strong>短剧</span>
          <span className="rounded-lg bg-[color:var(--surface-strong)] px-2 py-2"><strong className="block text-base">{cloudResources.length}</strong>云盘</span>
          <span className="rounded-lg bg-[color:var(--surface-strong)] px-2 py-2"><strong className="block text-base">{libraryCount}</strong>已备份</span>
        </div>
        <Link href="/library" className="focus-ring mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg border line px-3 text-xs font-semibold">打开媒体库<ArrowRight size={14}/></Link>
      </aside>
    </header>

    <SearchExperience dramas={dramas} platforms={platforms} initialQuery={q ?? ""} initialPlatform={platform ?? "all"} embedded />

    <section className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Fire size={19} weight="fill" className="accent"/>热门短剧发现</h2><p className="mt-1 text-xs text-muted">不知道看什么时，从数据库热度最高的短剧开始。</p></div>
        <Link href="/rankings" className="focus-ring hidden min-h-10 items-center gap-1.5 rounded-lg border line px-3 text-xs font-semibold sm:inline-flex">查看排行榜<ArrowRight size={14}/></Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {trending.map((drama) => {
          const entity = toDramaEntity(drama);
          return <Link key={drama.id} href={`/drama/${drama.slug}`} className="focus-ring group grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-xl border line bg-[color:var(--surface)] p-2.5 hover:bg-[color:var(--surface-strong)]">
            <span className="relative h-28 overflow-hidden rounded-lg bg-[color:var(--surface-strong)]"><Image src={entity.cover} alt={`${entity.canonical_title} cover`} fill sizes="76px" className="object-cover transition-transform group-hover:scale-[1.03]"/></span>
            <span className="min-w-0">
              <strong className="line-clamp-2 text-sm">{entity.canonical_title}</strong>
              <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{entity.description}</span>
              <span className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted">{entity.genre.slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{tag}</span>)}{entity.episodes && <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{entity.episodes} Episodes</span>}</span>
            </span>
          </Link>;
        })}
        {!trending.length && <div className="surface col-span-full rounded-xl border line p-5 text-sm text-muted">暂无真实短剧数据库记录。请先通过搜索实时资源，或配置 Supabase 数据库后同步真实短剧实体。</div>}
      </div>
    </section>

    <section className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Trophy size={19} className="accent"/>平台短剧榜单</h2><p className="mt-1 text-xs text-muted">按平台发现热门短剧，每条都进入短剧详情页再搜索资源。</p></div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {platformPreview.map(({ platform: item, dramas: entries }) => <section key={item.id} className="surface rounded-xl border line p-3">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{item.name} TOP</h3><Link href={`/rankings?platform=${item.slug}`} className="focus-ring rounded-md text-xs font-semibold text-[color:var(--accent)]">更多</Link></div>
          <ol className="mt-2 grid gap-1.5">
            {entries.map((drama, index) => <li key={drama.id}><Link href={`/drama/${drama.slug}`} className="focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-[color:var(--surface-strong)]"><span className="grid size-7 place-items-center rounded-md bg-[color:var(--surface-strong)] text-xs font-bold">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{drama.titleEn || drama.titleZh}</span><ArrowRight size={14} className="text-muted"/></Link></li>)}
          </ol>
        </section>)}
        {!platformPreview.length && <div className="surface col-span-full rounded-xl border line p-5 text-sm text-muted">暂无真实平台榜单缓存。本区域不会再使用演示数据；请进入排行榜页刷新公开 API 数据。</div>}
      </div>
    </section>

    <section className="mt-6 grid gap-2 md:grid-cols-3">
      <Link href="/search" className="focus-ring surface flex min-h-16 items-center gap-3 rounded-xl border line p-4"><ClockCounterClockwise size={20} className="accent"/><span><strong className="block text-sm">Search History</strong><span className="text-xs text-muted">搜索页保存最近搜索，可删除历史。</span></span></Link>
      <Link href="/library" className="focus-ring surface flex min-h-16 items-center gap-3 rounded-xl border line p-4"><Cloud size={20} className="accent"/><span><strong className="block text-sm">Cloud Backup</strong><span className="text-xs text-muted">百度网盘、夸克网盘备用观看。</span></span></Link>
      <Link href="/subtitle-test" className="focus-ring surface flex min-h-16 items-center gap-3 rounded-xl border line p-4"><Star size={20} className="accent"/><span><strong className="block text-sm">AI Subtitle Lab</strong><span className="text-xs text-muted">保留可控视频源字幕扩展接口。</span></span></Link>
    </section>
  </div>;
}
