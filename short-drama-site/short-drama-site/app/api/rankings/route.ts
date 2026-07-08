import { NextResponse } from "next/server";
import { listDramas, listPlatforms } from "@/lib/repository";
import { searchDailymotion } from "@/lib/live-search/dailymotion";
import { searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import { searchDiscussionSignals } from "@/lib/live-search/discussion";
import type { LiveSearchResource } from "@/lib/types";

type Entry = { id: string; title: string; titleZh: string; synopsis: string; posterUrl: string; episodeCount?: number; languages: string[]; score: number; resourceCount: number; views: number; likes: number; comments: number; mentions: number; creators: number; href: string; badge: string };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [dramas, platforms] = await Promise.all([listDramas(), listPlatforms()]);
  const candidates = dramas.slice(0, 10);
  const discoveries = await Promise.all(candidates.map(async (drama) => {
    const [dm, official] = await Promise.allSettled([searchDailymotion(drama.titleEn || drama.titleZh), searchWithFirecrawl(drama.titleEn || drama.titleZh)]);
    return { drama, resources: [...(dm.status === "fulfilled" ? dm.value : []), ...(official.status === "fulfilled" ? official.value : [])] };
  }));
  const eligible = discoveries.filter((item) => item.resources.length > 0);
  const [youtube, tiktok] = await Promise.all([searchDiscussionSignals(eligible.map((item) => item.drama), "youtube"), searchDiscussionSignals(eligible.map((item) => item.drama), "tiktok")]);

  const panels = platforms.map((platform) => {
    const discussion = platform.id === "youtube" ? youtube : platform.id === "tiktok" ? tiktok : [];
    const entries = eligible.flatMap(({ drama, resources }) => {
      const platformResources = resources.filter((resource) => resource.platformId === platform.id);
      const signal = discussion.find((item) => item.dramaId === drama.id);
      if (!platformResources.length && !signal) return [];
      const allRealImages = [...platformResources, ...resources].map((resource) => resource.thumbnailUrl).filter(Boolean);
      const posterUrl = allRealImages[0] ?? signal?.thumbnailUrl;
      if (!posterUrl) return [];
      const metricResources = (platformResources.length ? platformResources : resources) as LiveSearchResource[];
      const views = metricResources.reduce((sum, resource) => sum + (resource.viewCount ?? 0), 0);
      const likes = metricResources.reduce((sum, resource) => sum + (resource.likeCount ?? 0), 0);
      const comments = metricResources.reduce((sum, resource) => sum + (resource.commentCount ?? 0), 0);
      const mentions = signal?.mentions ?? 0, creators = signal?.creatorCount ?? 0;
      const score = Math.round(Math.log10(views + 1) * 20 + Math.log10(likes + comments + 1) * 12 + mentions * 8 + creators * 5 + metricResources.length * 6);
      return [{ id: drama.id, title: drama.titleEn || drama.titleZh, titleZh: drama.titleZh, synopsis: metricResources.find((resource) => resource.description)?.description ?? "公开平台已验证该剧资源，简介以官方页面为准。", episodeCount: drama.episodeCount, languages: drama.languages, score, resourceCount: metricResources.length, views, likes, comments, mentions, creators, posterUrl, href: platformResources.length ? `/?q=${encodeURIComponent(drama.titleEn || drama.titleZh)}&platform=${platform.slug}` : `/?q=${encodeURIComponent(drama.titleEn || drama.titleZh)}`, badge: signal && !platformResources.length ? "讨论趋势" : "已验证资源" }];
    }).sort((a, b) => b.score - a.score).slice(0, 10);
    return { id: platform.id, name: platform.name, mode: discussion.length ? "讨论热度 + 已验证资源" : "真实资源热度", entries };
  });
  return NextResponse.json(
    { panels, updatedAt: new Date().toISOString(), firecrawlEnabled: Boolean(process.env.FIRECRAWL_API_KEY) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
