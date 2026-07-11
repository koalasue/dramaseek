import type { Metadata } from "next";
import { CoreActions } from "@/components/core-actions";
import { LiveRankings } from "@/components/live-rankings";
import { listDramas } from "@/lib/repository";

export const metadata: Metadata = { title: "海外短剧排行榜" };

export default async function RankingsPage() {
  const dramas = await listDramas();
  return <div className="page-shell py-4 md:py-6">
    <CoreActions active="rankings" />
    <header className="mt-5 max-w-3xl md:mt-7"><h1 className="text-xl font-semibold tracking-[-.02em] md:text-2xl">Platform Drama Ranking</h1><p className="mt-2 text-sm leading-6 text-muted">按平台展示具体热门短剧。每一条都进入短剧详情页，再搜索真实播放资源。</p></header>
    <LiveRankings dramas={dramas} />
  </div>;
}
