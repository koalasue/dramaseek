export type Language = "zh" | "en" | "es" | "other";
export type ResourceStatus = "active" | "limited" | "unavailable";

export interface Platform {
  id: string;
  slug: string;
  name: string;
  domain: string;
  color: string;
  offlineNote: string;
}

export interface Resource {
  id: string;
  platformId: string;
  url: string;
  language: Language;
  region: string;
  status: ResourceStatus;
  official: boolean;
  publishedAt?: string;
  checkedAt: string;
  sourceProof: string;
  contentType?: "full_series" | "episode";
}

export interface Drama {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  aliases: string[];
  synopsis: string;
  posterUrl: string;
  episodeCount?: number;
  languages: Language[];
  regions: string[];
  trendingScore: number;
  updatedAt: string;
  resources: Resource[];
}

export interface SearchFilters {
  query?: string;
  platform?: string;
  language?: Language | "all";
}

export interface SearchResult extends Drama {
  score: number;
}

export interface SubmissionInput {
  url: string;
  title?: string;
  note?: string;
  contact?: string;
}

export interface Submission extends SubmissionInput {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AdapterResult {
  title: string;
  aliases: string[];
  synopsis: string;
  posterUrl: string;
  episodeCount?: number;
  language: Language;
  region: string;
  officialUrl: string;
  publishedAt?: string;
  sourceProof: string;
  contentType: "full_series" | "episode";
}

export interface ContentCandidate {
  dramaTitle: string;
  pageTitle: string;
  description?: string;
  durationSeconds?: number;
  uploaderVerified: boolean;
  sourceProof?: string;
}

export interface LiveSearchResource {
  id: string;
  platformId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  uploader: string;
  contentType: "full_series" | "episode";
  verifiedOfficial: boolean;
  discoverySource?: "official_api" | "firecrawl" | "serpapi" | "manual" | "social";
  source_type?: "official_platform" | "official_channel" | "third_party_database" | "social_trend" | "search_discovery";
  official_source?: boolean;
  source_url?: string;
  confidence_score?: number;
  hot_score?: number;
  trend_direction?: "UP" | "DOWN" | "STABLE";
  genre?: string[];
  episodeCount?: number;
  officialDramaId?: string;
  officialRank?: number;
  discoveredAt?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  description?: string;
}

export interface LiveSearchResponse {
  resources: LiveSearchResource[];
  platformStatus: Record<string, "live" | "needs_key" | "unavailable">;
}
