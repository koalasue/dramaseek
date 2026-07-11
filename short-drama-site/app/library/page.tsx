import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowSquareOut, Cloud } from "@phosphor-icons/react/dist/ssr";
import { CoreActions } from "@/components/core-actions";
import { WatchHistory } from "@/components/watch-history";
import { listCloudResources, listDramas } from "@/lib/repository";

export const metadata: Metadata = { title: "My Library" };

function cloudName(type: "baidu" | "quark") {
  return type === "baidu" ? "百度网盘" : "夸克网盘";
}

export default async function LibraryPage() {
  const [dramas, cloudResources] = await Promise.all([listDramas(), listCloudResources()]);
  const backedDramaIds = new Set(cloudResources.map((item) => item.dramaId).filter(Boolean));
  const favoriteDramas = dramas.filter((drama) => backedDramaIds.has(drama.id) || drama.resources.length > 0).slice(0, 24);

  return <div className="page-shell py-4 md:py-6">
    <CoreActions active="library" />
    <header className="mt-5 max-w-3xl md:mt-7">
      <h1 className="text-xl font-semibold tracking-[-.02em] md:text-2xl">My Library</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">个人短剧媒体库：查看收藏短剧、云盘备份和本机观看记录。</p>
    </header>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <section className="surface rounded-xl border line p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">收藏短剧</h2>
          <span className="text-xs text-muted">{favoriteDramas.length} 部</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteDramas.length ? favoriteDramas.map((drama) => {
            const cloudCount = cloudResources.filter((item) => item.dramaId === drama.id && item.cloudStatus !== "expired").length;
            const platforms = [...new Set(drama.resources.map((resource) => resource.platform ?? resource.platformId))];
            return <Link key={drama.id} href={`/drama/${drama.slug}`} className="focus-ring group grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-lg border line p-2 hover:bg-[color:var(--surface-strong)]">
              <span className="relative h-24 overflow-hidden rounded-md bg-[color:var(--surface-strong)]"><Image src={drama.posterUrl} alt={`${drama.titleZh} 海报`} fill sizes="64px" className="object-cover transition-transform group-hover:scale-[1.03]"/></span>
              <span className="min-w-0">
                <strong className="line-clamp-2 text-sm">{drama.titleZh}</strong>
                <span className="mt-1 block truncate text-xs text-muted">{drama.titleEn}</span>
                <span className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted">
                  {platforms.slice(0, 2).map((platform) => <span key={platform} className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">{platform}</span>)}
                  <span className="rounded-md bg-[color:var(--surface-strong)] px-1.5 py-0.5">☁ {cloudCount ? `${cloudCount} 个备份` : "未备份"}</span>
                </span>
              </span>
            </Link>;
          }) : <p className="rounded-lg bg-[color:var(--surface-strong)] px-3 py-4 text-sm text-muted sm:col-span-2 lg:col-span-3">还没有收藏或备份短剧。先从搜索结果进入详情页，点击“备份到云盘”。</p>}
        </div>
      </section>

      <div className="grid gap-5">
        <section className="surface rounded-xl border line p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold"><Cloud size={18}/>已备份资源</h2>
            <span className="text-xs text-muted">{cloudResources.length} 条</span>
          </div>
          <div className="mt-3 grid gap-2">
            {cloudResources.length ? cloudResources.slice(0, 20).map((item) => {
              const drama = dramas.find((entry) => entry.id === item.dramaId);
              const source = item.platform ?? drama?.resources[0]?.platform ?? drama?.resources[0]?.platformId ?? "手动记录";
              return <a key={item.id} href={item.cloudUrl} target="_blank" rel="noopener noreferrer" className="focus-ring grid gap-1 rounded-lg border line px-3 py-2 text-sm hover:bg-[color:var(--surface-strong)]">
                <span className="flex items-center justify-between gap-3"><strong>{drama?.titleZh ?? "未关联短剧"}</strong><ArrowSquareOut size={14}/></span>
                <span className="text-xs text-muted">{source} · {cloudName(item.cloudType)} · {item.cloudStatus === "saved" ? "已备份" : item.cloudStatus === "processing" ? "处理中" : "已失效"}{item.episode ? ` · 第 ${item.episode} 集` : ""}</span>
              </a>;
            }) : <p className="rounded-lg bg-[color:var(--surface-strong)] px-3 py-4 text-sm text-muted">暂无云盘备份。</p>}
          </div>
        </section>

        <WatchHistory />
      </div>
    </div>
  </div>;
}
