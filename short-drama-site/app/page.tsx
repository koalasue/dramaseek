import type { Metadata } from "next";
import { CoreActions } from "@/components/core-actions";
import { SearchExperience } from "@/components/search-experience";
import { listDramas, listPlatforms } from "@/lib/repository";

export const metadata: Metadata = { title: "搜索海外短剧" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; platform?: string }> }) {
  const [{ q, platform }, dramas, platforms] = await Promise.all([searchParams, listDramas(), listPlatforms()]);
  return <div className="page-shell py-4 md:py-6">
    <CoreActions active="search" />
    <header className="mt-5 max-w-3xl md:mt-7"><h1 className="text-xl font-semibold tracking-[-.02em] text-balance md:text-2xl">搜索海外短剧</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted text-pretty">输入剧名、关键词或类型，快速查看真实正片来源。</p></header>
    <SearchExperience dramas={dramas} platforms={platforms} initialQuery={q ?? ""} initialPlatform={platform ?? "all"} embedded />
  </div>;
}
