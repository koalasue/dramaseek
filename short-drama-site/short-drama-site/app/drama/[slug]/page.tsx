import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowSquareOut, CalendarBlank, Globe, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getDramaBySlug, listPlatforms } from "@/lib/repository";
import { PlatformMark } from "@/components/platform-mark";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const drama = await getDramaBySlug((await params).slug);
  return drama ? { title: drama.titleZh, description: drama.synopsis } : { title: "未找到短剧" };
}

export default async function DramaPage({ params }: { params: Promise<{ slug: string }> }) {
  const [drama, platforms] = await Promise.all([getDramaBySlug((await params).slug), listPlatforms()]);
  if (!drama) notFound();
  return <div className="page-shell py-10 md:py-16">
    <Link href="/search" className="focus-ring rounded-md text-sm text-muted">返回搜索</Link>
    <section className="mt-6 grid gap-8 md:grid-cols-[minmax(260px,360px)_1fr] lg:gap-14">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl"><Image src={drama.posterUrl} alt={`${drama.titleZh}海报`} fill priority sizes="(max-width:768px) 100vw, 360px" className="object-cover" /></div>
      <div className="py-2"><div className="flex flex-wrap items-center gap-3 text-sm text-muted"><span className="inline-flex items-center gap-1"><SealCheck size={17} weight="fill" className="accent"/>正版来源</span>{drama.episodeCount && <span>{drama.episodeCount} 集</span>}<span>{drama.languages.map((item) => item.toUpperCase()).join(" / ")}</span></div><h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.04em] md:text-6xl">{drama.titleZh}</h1><p className="mt-3 text-lg text-muted">{drama.titleEn}</p><p className="mt-6 max-w-2xl text-base leading-7 text-muted">{drama.synopsis}</p>{drama.aliases.length > 0 && <p className="mt-5 text-sm text-muted">别名：{drama.aliases.join("、")}</p>}
        <div className="mt-10"><h2 className="text-xl font-semibold">官方观看入口</h2><div className="mt-4 grid gap-3">{drama.resources.map((resource) => { const platform = platforms.find((item) => item.id === resource.platformId); if (!platform) return null; return <article key={resource.id} className="surface grid gap-4 rounded-2xl border line p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><PlatformMark platform={platform}/><div className="mt-3 flex flex-wrap gap-4 text-xs text-muted"><span className="inline-flex items-center gap-1"><Globe size={14}/>{resource.region} / {resource.language.toUpperCase()}</span><span className="inline-flex items-center gap-1"><CalendarBlank size={14}/>检查于 {new Date(resource.checkedAt).toLocaleDateString("zh-CN")}</span></div><p className="mt-3 text-xs text-muted">来源证明：{resource.sourceProof}</p><p className="mt-2 text-xs text-muted">{platform.offlineNote}</p></div><a href={resource.url} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg pressable inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold">官方观看<ArrowSquareOut size={17}/></a></article>})}</div></div>
      </div>
    </section>
  </div>;
}
