import type { Metadata } from "next";
import { CoreActions } from "@/components/core-actions";
import { LiveRankings } from "@/components/live-rankings";

export const metadata: Metadata = { title: "海外短剧排行榜" };

export default function RankingsPage() {
  return <div className="page-shell py-8 md:py-12">
    <CoreActions active="rankings" />
    <header className="mt-10 max-w-3xl md:mt-14"><h1 className="text-3xl font-semibold tracking-[-.035em] md:text-5xl">平台短剧排行榜</h1><p className="mt-3 leading-7 text-muted">只展示已检索到真实资源和真实封面的短剧。YouTube、TikTok 按讨论与二创频率估算趋势，其他平台按已验证资源热度排列。</p></header>
    <LiveRankings />
  </div>;
}
