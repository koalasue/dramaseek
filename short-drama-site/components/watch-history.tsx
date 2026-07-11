"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WatchHistoryItem = { url: string; title: string; watchedAt: string };

export function WatchHistory() {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dramaseek:watch-history") ?? "[]") as WatchHistoryItem[];
      setItems(saved.filter((item) => item.url && item.title).slice(0, 12));
    } catch {
      setItems([]);
    }
  }, []);

  return <section className="surface rounded-xl border line p-4">
    <h2 className="text-base font-semibold">观看记录</h2>
    <div className="mt-3 grid gap-2">
      {items.length ? items.map((item) => <Link key={`${item.url}:${item.watchedAt}`} href={`/watch?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`} className="focus-ring rounded-lg border line px-3 py-2 text-sm hover:bg-[color:var(--surface-strong)]">
        <span className="block font-medium">{item.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{new Date(item.watchedAt).toLocaleString("zh-CN")}</span>
      </Link>) : <p className="rounded-lg bg-[color:var(--surface-strong)] px-3 py-4 text-sm text-muted">暂无观看记录。打开一次在线播放页面后会自动记录在本机。</p>}
    </div>
  </section>;
}
