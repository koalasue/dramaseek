import type { Metadata } from "next";
import { CoreActions } from "@/components/core-actions";
import { LiveRankings } from "@/components/live-rankings";

export const metadata: Metadata = { title: "海外短剧排行榜" };

export default function RankingsPage() {
  return <div className="page-shell py-8 md:py-12">
    <CoreActions active="rankings" />
    <header className="mt-10 max-w-3xl md:mt-14"><h1 className="text-3xl font-semibold tracking-[-.035em] md:text-5xl">海外短剧热门发现</h1><p className="mt-3 leading-7 text-muted">Global Trending 优先展示官方平台、真实封面、明确集数和高可信度资源。普通搜索结果、预告、解说、剪辑和电影内容不会进入榜单。</p></header>
    <LiveRankings />
  </div>;
}
