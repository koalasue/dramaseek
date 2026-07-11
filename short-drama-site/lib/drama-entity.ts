import { inferGenres } from "@/lib/rankings/quality";
import { cleanDramaTitle } from "@/lib/rankings/metadata";
import { normalizeText, similarity } from "@/lib/search";
import type { Drama } from "@/lib/types";

export interface DramaEntity {
  id: string;
  slug: string;
  canonical_title: string;
  aliases: string[];
  cover: string;
  description: string;
  genre: string[];
  platforms: string[];
  episodes?: number;
}

export function toDramaEntity(drama: Drama): DramaEntity {
  return {
    id: drama.id,
    slug: drama.slug,
    canonical_title: drama.titleEn || drama.titleZh,
    aliases: [drama.titleZh, drama.titleEn, ...(drama.aliases ?? [])].filter(Boolean),
    cover: drama.cover ?? drama.posterUrl,
    description: drama.description ?? drama.synopsis,
    genre: drama.genre?.length ? drama.genre : inferGenres({ title: `${drama.titleEn} ${drama.titleZh}`, description: drama.synopsis }),
    platforms: [...new Set(drama.resources.map((resource) => resource.platform ?? resource.platformId))],
    episodes: drama.episodes ?? drama.episodeCount,
  };
}

export function matchDramaEntity(dramas: Drama[], title: string) {
  const cleanTitle = cleanDramaTitle(title);
  const needle = normalizeText(cleanTitle);
  if (!needle) return null;
  const ranked = dramas.map((drama) => {
    const entity = toDramaEntity(drama);
    const fields = [entity.canonical_title, ...entity.aliases];
    const score = Math.max(...fields.map((field) => {
      const value = normalizeText(field);
      if (value === needle) return 1.2;
      if (value.includes(needle) || needle.includes(value)) return 1;
      return similarity(value, needle);
    }));
    return { drama, score };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 0.38 ? ranked[0].drama : null;
}
