import { ArrowSquareOut, Binoculars } from "@phosphor-icons/react";
import { getPlatformSearchUrl } from "@/lib/platform-search";
import type { Platform } from "@/lib/types";
import { PlatformMark } from "@/components/platform-mark";

export function PlatformSearchFallback({ query, platforms, selectedPlatform }: { query: string; platforms: Platform[]; selectedPlatform: string }) {
  if (!query.trim()) return null;
  const targets = selectedPlatform === "all" ? platforms : platforms.filter((platform) => platform.slug === selectedPlatform);
  return <section className="surface mt-5 rounded-2xl border line p-5 md:p-6">
    <div className="flex items-start gap-3"><Binoculars size={24} className="accent mt-0.5 shrink-0"/><div><h3 className="font-semibold">查找待核验正片</h3><p className="mt-1 text-sm leading-6 text-muted">搜索词会排除解说、影评、预告和反应视频。平台结果尚未经过本站核验，不会混入上方正式资源。</p></div></div>
    <div className="mt-5 flex flex-wrap gap-3">{targets.map((platform) => <a key={platform.id} href={getPlatformSearchUrl(platform, query)} target="_blank" rel="noopener noreferrer" className="focus-ring pressable inline-flex items-center gap-3 rounded-xl border line px-4 py-3 text-sm hover:bg-[color:var(--surface-strong)]"><PlatformMark platform={platform}/><ArrowSquareOut size={17}/></a>)}</div>
  </section>;
}
