import Link from "next/link";
import { DownloadSimple, MagnifyingGlass, Trophy } from "@phosphor-icons/react/dist/ssr";

export function CoreActions({ active }: { active: "search" | "rankings" | "downloads" }) {
  const items = [
    { id: "search", href: "/", label: "搜索海外短剧", detail: "实时查找正片来源", icon: MagnifyingGlass },
    { id: "rankings", href: "/rankings", label: "平台短剧排行榜", detail: "按平台发现热门短剧", icon: Trophy },
    { id: "downloads", href: "/downloads", label: "授权内容下载", detail: "保存自有媒体文件", icon: DownloadSimple }
  ] as const;
  return <nav aria-label="核心功能" className="grid gap-2 sm:grid-cols-3">
    {items.map((item) => { const Icon = item.icon; const selected = active === item.id; return <Link key={item.id} href={item.href} aria-current={selected ? "page" : undefined} className={`focus-ring pressable flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 md:min-h-16 md:px-4 ${selected ? "accent-bg border-transparent" : "surface line hover:bg-[color:var(--surface-strong)]"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-white/15" : "surface-strong"}`}><Icon size={19} weight="bold"/></span><span className="min-w-0"><strong className="block truncate text-sm md:text-base">{item.label}</strong><span className={`mt-0.5 hidden text-xs sm:block ${selected ? "text-[color:var(--accent-ink)]/75" : "text-muted"}`}>{item.detail}</span></span></Link>; })}
  </nav>;
}
