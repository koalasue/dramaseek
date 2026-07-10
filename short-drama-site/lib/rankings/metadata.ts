import type { LiveSearchResource } from "@/lib/types";
import { extractEpisodeCount, inferGenres, isRejectedRankingContent } from "@/lib/rankings/quality";

const platformNames = /\b(reelshort|dramabox|shortmax|goodshort|flextv|netshort|youtube|dailymotion|tiktok)\b/gi;
const seoFragments = [
  /\bwatch\s+(?:the\s+)?(?:full\s+)?(?:short\s+)?drama\b/gi,
  /\bwatch\s+free\b/gi,
  /\bfull\s+episodes?\b/gi,
  /\bcomplete\s+series\b/gi,
  /\bshort\s+drama\b/gi,
  /\bmini\s+drama\b/gi,
  /\bmovie\s+recap\b/gi,
  /\b(?:ep|eps|episode|episodes)\s*\d+\s*(?:[-–~]\s*\d+)?\b/gi,
  /\b(?:part|option)\s*\d+\b/gi,
  /\b(?:official|channel|app|download|link\s+in\s+bio)\b/gi,
  /(?:全集|全剧|完整版|短剧|官方|下载|观看)/g,
];

const genericTitlePattern = /\b(watch free|tv shows|movies|tubi|official channel|short drama app|full movie|what'?s|supposed to|employee|responsibility|accept you|watch more|episodes? on)\b/i;
const dialoguePattern = /\b(i|you|he|she|we|they|my|your|his|her|our|their|that'?s|what'?s|don'?t|can'?t|won'?t|i'?m|you'?re|she'?s|he'?s)\b/i;

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function titleCaseIfNeeded(value: string) {
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) return value;
  return value.toLowerCase().replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

export function cleanDramaTitle(rawTitle: string) {
  const decoded = decodeHtml(rawTitle);
  const bracketTitles = [...decoded.matchAll(/[\[【]([^\]】]{3,90})[\]】]/g)]
    .map((match) => match[1].trim())
    .filter((value) => !isRejectedRankingContent(value) && !genericTitlePattern.test(value));
  const bracketTitle = bracketTitles.at(-1);
  if (bracketTitle) return cleanDramaTitle(bracketTitle);

  let title = decoded
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/#[\p{L}\p{N}_-]+/gu, " ")
    .replace(/\[[^\]]*(?:watch|ep|episode|full|trailer|recap|review|official|link)[^\]]*\]/gi, " ")
    .replace(/\([^\)]*(?:watch|ep|episode|full|trailer|recap|review|official|drama|link)[^\)]*\)/gi, " ");

  const segments = title.split(/\s+[|｜]\s+|\s+-\s+|\s+–\s+|:\s+/).map((part) => part.trim()).filter(Boolean);
  title = segments.find((part) => !genericTitlePattern.test(part) && !dialoguePattern.test(part)) ?? segments.find((part) => !genericTitlePattern.test(part)) ?? title;
  for (const pattern of seoFragments) title = title.replace(pattern, " ");
  title = title.replace(platformNames, " ");
  title = title.replace(/[🎬🔥💕💖💘❤️❤💔✨⭐️🌹]+/g, " ");
  title = title.replace(/\s{2,}/g, " ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}!?'"’]+$/gu, "").trim();

  return title ? titleCaseIfNeeded(title) : decoded.trim();
}

export function shortDescription(resource: Pick<LiveSearchResource, "title" | "description" | "genre"> & { cleanTitle?: string }) {
  const rawDescription = decodeHtml(resource.description ?? "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/#[\p{L}\p{N}_-]+/gu, "")
    .replace(platformNames, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (rawDescription && rawDescription.length >= 36 && !isRejectedRankingContent(rawDescription) && !genericTitlePattern.test(rawDescription)) {
    return rawDescription.length > 150 ? `${rawDescription.slice(0, 148).trim()}…` : rawDescription;
  }

  const title = resource.cleanTitle ?? cleanDramaTitle(resource.title);
  const genres = resource.genre?.length ? resource.genre : inferGenres({ title: resource.title, description: resource.description });
  const has = (name: string) => genres.includes(name);
  if (has("Mafia")) return `${title} 是一部围绕黑帮权力、禁忌爱情与身份危机展开的海外竖屏短剧。`;
  if (has("Werewolf")) return `${title} 讲述命运羁绊、族群秘密与强烈情感冲突交织的狼人题材短剧。`;
  if (has("CEO") || has("Billionaire")) return `${title} 聚焦豪门、身份反转与高压爱情关系，适合喜欢 CEO / 亿万富翁题材的观众。`;
  if (has("Revenge")) return `${title} 以背叛后的反击和情感拉扯为核心，是节奏紧凑的复仇向短剧。`;
  if (has("Marriage")) return `${title} 围绕契约婚姻、误会与真相揭开推进，是典型高甜高虐短剧。`;
  return `${title} 是一部海外热门竖屏短剧，包含强情节反转、快节奏冲突和连续剧式追看体验。`;
}

export function buildDramaMetadata(resource: LiveSearchResource) {
  const cleanTitle = cleanDramaTitle(resource.title);
  const evidence = `${resource.title} ${resource.description ?? ""}`;
  const episodes = resource.episodeCount ?? extractEpisodeCount(evidence);
  const genre = resource.genre?.length ? resource.genre : inferGenres({ title: cleanTitle, description: resource.description });

  return {
    title: cleanTitle,
    original_title: decodeHtml(resource.title),
    clean_title: cleanTitle,
    description: shortDescription({ ...resource, cleanTitle, genre }),
    genre,
    episodes,
    platform: resource.platformId,
    country: "Global",
    cast: [] as string[],
  };
}
