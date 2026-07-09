import type { Platform } from "@/lib/types";

export function PlatformMark({ platform, compact = false }: { platform: Platform; compact?: boolean }) {
  return <span className="inline-flex items-center gap-2 font-medium"><span aria-hidden className="grid size-7 place-items-center rounded-lg bg-[color:var(--surface-strong)] text-xs font-bold">{platform.name.slice(0, 1)}</span>{!compact && platform.name}</span>;
}
