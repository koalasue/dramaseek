import type { Platform } from "@/lib/types";

const builders: Record<string, (query: string) => string> = {
  youtube: (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`"${query}" "full episodes" -review -recap -explained -trailer -reaction`)}`,
  dailymotion: (query) => `https://www.dailymotion.com/tw/search/${encodeURIComponent(`"${query}" full episodes -review -recap -explained -trailer`)}/videos`,
  tiktok: (query) => `https://www.tiktok.com/search?q=${encodeURIComponent(`"${query}" full episode -review -recap -explained -trailer`)}`,
  netshort: (query) => `https://netshort.com/search?keyword=${encodeURIComponent(`"${query}" full episodes`)}`,
  reelshort: (query) => `https://www.reelshort.com/search?keywords=${encodeURIComponent(`"${query}" full episodes`)}`,
  dramabox: (query) => `https://www.dramabox.com/search?searchValue=${encodeURIComponent(`"${query}" full episodes`)}`
};

export function getPlatformSearchUrl(platform: Platform, query: string) {
  return builders[platform.slug]?.(query) ?? `https://${platform.domain}`;
}
