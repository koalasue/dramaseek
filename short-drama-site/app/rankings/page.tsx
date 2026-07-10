import type { Metadata } from "next";
import { CoreActions } from "@/components/core-actions";
import { LiveRankings } from "@/components/live-rankings";

export const metadata: Metadata = { title: "海外短剧排行榜" };

export default function RankingsPage() {
  return <div className="page-shell py-4 md:py-6">
    <CoreActions active="rankings" />
    <header className="mt-5 max-w-3xl md:mt-7"><h1 className="text-xl font-semibold tracking-[-.02em] md:text-2xl">海外短剧发现榜</h1><p className="mt-2 text-sm leading-6 text-muted">像 JustWatch 找资源，像 IMDb 看热度：先判断值不值得追，再进入官方播放来源。</p></header>
    <LiveRankings />
  </div>;
}
