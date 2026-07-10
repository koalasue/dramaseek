import { normalizeText } from "@/lib/search";
import type { ContentCandidate } from "@/lib/types";

const rejectedTerms = [
  "review", "recap", "explained", "explanation", "reaction", "trailer", "teaser", "commentary",
  "ending explained", "story explained", "剧情解说", "解说", "讲解", "盘点", "吐槽", "影评", "预告", "花絮", "混剪"
];
const episodeTerms = ["full episode", "full episodes", "complete series", "full movie", "episode", "ep ", "全集", "完整版", "全剧", "短剧"];

export interface Classification {
  accepted: boolean;
  contentType?: "full_series" | "episode";
  reasons: string[];
}

export function classifyShortDramaCandidate(candidate: ContentCandidate): Classification {
  const haystack = `${candidate.pageTitle} ${candidate.description ?? ""}`.toLocaleLowerCase();
  const reasons: string[] = [];
  if (!candidate.uploaderVerified || !candidate.sourceProof?.trim()) reasons.push("发布者或授权来源未验证");
  if (!normalizeText(candidate.pageTitle).includes(normalizeText(candidate.dramaTitle))) reasons.push("标题与目标剧名不匹配");
  const rejected = rejectedTerms.find((term) => haystack.includes(term));
  if (rejected) reasons.push(`包含非正片特征词：${rejected}`);
  const episodic = episodeTerms.some((term) => haystack.includes(term));
  const plausibleDuration = candidate.durationSeconds == null || candidate.durationSeconds >= 45;
  if (!episodic && !plausibleDuration) reasons.push("缺少剧集标记且时长过短");
  if (reasons.length) return { accepted: false, reasons };
  const fullSeries = /full episodes|complete series|full movie|全集|完整版|全剧/i.test(haystack) || (candidate.durationSeconds ?? 0) >= 900;
  return { accepted: true, contentType: fullSeries ? "full_series" : "episode", reasons: [fullSeries ? "已识别为完整合集" : "已识别为剧集正片"] };
}
