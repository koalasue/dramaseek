export type Language = "zh" | "en" | "es" | "other";
export type ResourceStatus = "active" | "limited" | "unavailable";
export type PlayType = "direct" | "embed" | "external" | "cloud" | "unavailable";
export type PlaybackStatus = "available" | "login_required" | "expired" | "private";
export type CloudType = "baidu" | "quark";
export type CloudStatus = "saved" | "processing" | "expired";

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
  resourceId?: string;
  dramaId?: string;
  platformId: string;
  platform?: string;
  url: string;
  videoId?: string;
  playType?: PlayType;
  playbackStatus?: PlaybackStatus;
  language: Language;
  region: string;
  status: ResourceStatus;
  official: boolean;
  publishedAt?: string;
  checkedAt: string;
  sourceProof: string;
  contentType?: "full_series" | "episode";
  qualityScore?: number;
  lastCheckTime?: string;
}

export interface Drama {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  title?: string;
  originalTitle?: string;
  cover?: string;
  description?: string;
  genre?: string[];
  episodes?: number;
  country?: string;
  language?: Language;
  aliases: string[];
  synopsis: string;
  posterUrl: string;
  episodeCount?: number;
  languages: Language[];
  regions: string[];
  trendingScore: number;
  updatedAt: string;
  resources: Resource[];
  sources?: Source[];
  cloudSources?: CloudSource[];
}

export interface Source {
  id: string;
  dramaId: string;
  platform: string;
  url: string;
  videoId?: string;
  playType: PlayType;
  status: PlaybackStatus;
  qualityScore?: number;
  lastCheckTime?: string;
}

export interface CloudSource {
  id: string;
  dramaId?: string;
  episode?: number;
  platform?: string;
  cloudType: CloudType;
  cloudUrl: string;
  cloudStatus: CloudStatus;
  createdTime: string;
}

export interface CloudResourceInput {
  dramaId?: string;
  episode?: number;
  platform?: string;
  cloudType: CloudType;
  cloudUrl: string;
  status?: CloudStatus;
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

export type PersonalAccountPlatform = "reelshort" | "dramabox" | "shortmax" | "goodshort" | "flextv" | "netshort" | "tiktok";
export type PersonalAccountConnectionMode = "guest" | "personal_account" | "manual";
export type PersonalAccountStatus = "not_connected" | "connected" | "expired" | "needs_action" | "disabled";

export interface PersonalAccountConnection {
  id: string;
  platformId: PersonalAccountPlatform;
  platformName: string;
  mode: PersonalAccountConnectionMode;
  accountLabel?: string;
  status: PersonalAccountStatus;
  lastSyncTime?: string;
  syncedDramaCount: number;
  failedCount: number;
  loginRequiredCount: number;
  privateCount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
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
  play_type?: PlayType;
  status?: PlaybackStatus;
  quality_score?: number;
  video_id?: string;
  verifiedOfficial: boolean;
  discoverySource?: "official_api" | "firecrawl" | "serpapi" | "agent_reach" | "manual" | "social" | "public_aggregator";
  source_type?: "official_platform" | "official_channel" | "public_aggregator" | "third_party_database" | "social_trend" | "search_discovery";
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

export interface DramaTrend {
  id: string;
  drama_id?: string;
  platform: string;
  views: number;
  search_score: number;
  social_score: number;
  update_score: number;
  heat_score: number;
  trend_direction: "UP" | "DOWN" | "STABLE";
  source_url?: string;
  source_type?: LiveSearchResource["source_type"];
  updated_at: string;
}
