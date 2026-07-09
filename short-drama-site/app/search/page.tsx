import type { Metadata } from "next";
import { SearchExperience } from "@/components/search-experience";
import { listDramas, listPlatforms } from "@/lib/repository";

export const metadata: Metadata = { title: "搜索海外短剧" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, dramas, platforms] = await Promise.all([searchParams, listDramas(), listPlatforms()]);
  return <><div className="page-shell pt-12"><h1 className="text-3xl font-semibold tracking-tight md:text-5xl">搜索海外短剧</h1><p className="mt-3 text-muted">专注海外竖屏短剧，同一部剧的多个官方来源会整理在同一结果中。</p></div><SearchExperience dramas={dramas} platforms={platforms} initialQuery={q ?? ""} /></>;
}
