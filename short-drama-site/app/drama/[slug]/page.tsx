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
  return <div className="page-shell py-5 md:py-7">
    <Link href="/search" className="focus-ring rounded-md text-sm text-muted">返回搜索</Link>
    <section className="mt-4 grid gap-5 md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr]">
      <div className="relative mx-auto aspect-[3/4] w-[150px] overflow-hidden rounded-xl md:w-full"><Image src={drama.posterUrl} alt={`${drama.titleZh}海报`} fill priority sizes="(max-width:768px) 150px, 220px" className="object-cover" /></div>
      <div className="py-1"><div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><SealCheck size={14} weight="fill" className="accent"/>正版来源</span>{drama.episodeCount && <span>{drama.episodeCount} 集</span>}<span>{drama.languages.map((item) => item.toUpperCase()).join(" / ")}</span></div><h1 className="mt-2 text-2xl font-semibold leading-tight tracking-[-.03em] md:text-3xl">{drama.titleZh}</h1><p className="mt-1 text-sm text-muted">{drama.titleEn}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{drama.synopsis}</p>{drama.aliases.length > 0 && <p className="mt-3 text-xs text-muted">别名：{drama.aliases.join("、")}</p>}
        <div className="mt-5"><h2 className="text-base font-semibold">官方观看入口</h2><div className="mt-3 grid gap-2">{drama.resources.map((resource) => { const platform = platforms.find((item) => item.id === resource.platformId); if (!platform) return null; return <article key={resource.id} className="surface grid gap-3 rounded-xl border line p-3 md:grid-cols-[1fr_auto] md:items-center"><div><PlatformMark platform={platform}/><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Globe size={13}/>{resource.region} / {resource.language.toUpperCase()}</span><span className="inline-flex items-center gap-1"><CalendarBlank size={13}/>检查于 {new Date(resource.checkedAt).toLocaleDateString("zh-CN")}</span></div><p className="mt-2 text-[11px] text-muted">来源证明：{resource.sourceProof}</p><p className="mt-1 text-[11px] text-muted">{platform.offlineNote}</p></div><a href={resource.url} target="_blank" rel="noopener noreferrer" className="focus-ring accent-bg pressable inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold">官方观看<ArrowSquareOut size={15}/></a></article>})}</div></div>
      </div>
    </section>
  </div>;
}
