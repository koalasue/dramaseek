import type { Metadata } from "next";
import { CoreActions } from "@/components/core-actions";
import { SearchExperience } from "@/components/search-experience";
import { listDramas, listPlatforms } from "@/lib/repository";

export const metadata: Metadata = { title: "搜索海外短剧" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; platform?: string }> }) {
  const [{ q, platform }, dramas, platforms] = await Promise.all([searchParams, listDramas(), listPlatforms()]);
  return <div className="page-shell py-8 md:py-12">
    <CoreActions active="search" />
    <header className="mt-10 max-w-3xl md:mt-14"><h1 className="text-3xl font-semibold tracking-[-.035em] text-balance md:text-5xl">搜索海外短剧</h1><p className="mt-3 max-w-2xl leading-7 text-muted text-pretty">输入原始剧名，按平台查看完整正片与合集。解说、预告和续集误匹配会被过滤。</p></header>
    <SearchExperience dramas={dramas} platforms={platforms} initialQuery={q ?? ""} initialPlatform={platform ?? "all"} embedded />
  </div>;
}
