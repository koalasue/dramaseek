import Link from "next/link";
import { DownloadSimple, MagnifyingGlass, Trophy } from "@phosphor-icons/react/dist/ssr";

export function CoreActions({ active }: { active: "search" | "rankings" | "downloads" }) {
  const items = [
    { id: "search", href: "/", label: "搜索海外短剧", detail: "实时查找正片来源", icon: MagnifyingGlass },
    { id: "rankings", href: "/rankings", label: "平台短剧排行榜", detail: "按平台发现热门短剧", icon: Trophy },
    { id: "downloads", href: "/downloads", label: "授权内容下载", detail: "保存自有媒体文件", icon: DownloadSimple }
  ] as const;
  return <nav aria-label="核心功能" className="grid gap-3 sm:grid-cols-3">
    {items.map((item) => { const Icon = item.icon; const selected = active === item.id; return <Link key={item.id} href={item.href} aria-current={selected ? "page" : undefined} className={`focus-ring pressable flex min-h-24 items-center gap-4 rounded-2xl border p-4 md:p-5 ${selected ? "accent-bg border-transparent" : "surface line hover:bg-[color:var(--surface-strong)]"}`}><span className={`grid size-12 shrink-0 place-items-center rounded-xl ${selected ? "bg-white/15" : "surface-strong"}`}><Icon size={24} weight="bold"/></span><span><strong className="block text-base md:text-lg">{item.label}</strong><span className={`mt-1 block text-sm ${selected ? "text-[color:var(--accent-ink)]/75" : "text-muted"}`}>{item.detail}</span></span></Link>; })}
  </nav>;
}
