import type { Drama, Platform, SearchFilters, SearchResult } from "@/lib/types";

export function normalizeText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function bigrams(value: string) {
  const normalized = normalizeText(value);
  if (normalized.length < 2) return new Set([normalized]);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
}

export function similarity(left: string, right: string) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((item) => b.has(item)).length;
  return (2 * overlap) / (a.size + b.size);
}

export function scoreDrama(drama: Drama, query: string) {
  if (!query.trim()) return drama.trendingScore / 100;
  const needle = normalizeText(query);
  const fields = [drama.titleZh, drama.titleEn, ...drama.aliases];
  return Math.max(...fields.map((field, index) => {
    const value = normalizeText(field);
    if (value === needle) return index < 2 ? 1.2 : 1.1;
    if (value.includes(needle)) return index < 2 ? 1 : 0.92;
    return similarity(value, needle) * (index < 2 ? 0.9 : 0.8);
  }));
}

export function searchDramas(items: Drama[], platformItems: Platform[], filters: SearchFilters): SearchResult[] {
  const platformId = filters.platform && filters.platform !== "all"
    ? platformItems.find((item) => item.slug === filters.platform)?.id
    : undefined;
  return items
    .map((drama) => ({ ...drama, score: scoreDrama(drama, filters.query ?? "") }))
    .filter((drama) => drama.resources.some((resource) => resource.official && resource.status !== "unavailable" && Boolean(resource.sourceProof)))
    .filter((drama) => !filters.query?.trim() || drama.score >= 0.2)
    .filter((drama) => !platformId || drama.resources.some((resource) => resource.platformId === platformId && resource.status !== "unavailable"))
    .filter((drama) => !filters.language || filters.language === "all" || drama.languages.includes(filters.language))
    .sort((a, b) => b.score - a.score || b.trendingScore - a.trendingScore);
}
