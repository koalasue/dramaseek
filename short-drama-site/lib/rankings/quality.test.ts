import { describe, expect, it } from "vitest";
import { enrichRankingResource, isEligibleRankingResource, isRejectedRankingContent } from "@/lib/rankings/quality";
import type { LiveSearchResource } from "@/lib/types";

const officialResource: LiveSearchResource = {
  id: "reelshort:1",
  platformId: "reelshort",
  title: "My Mafia Husband Full Episodes",
  url: "https://www.reelshort.com/full-episodes/my-mafia-husband-12345",
  thumbnailUrl: "https://example.com/cover.jpg",
  uploader: "ReelShort 官方站",
  contentType: "full_series",
  verifiedOfficial: true,
  source_type: "official_platform",
  official_source: true,
  description: "A romance mafia short drama with 72 episodes.",
  viewCount: 100000,
};

describe("ranking quality gate", () => {
  it("rejects commentary, trailers, movies and SEO-like garbage terms", () => {
    expect(isRejectedRankingContent("CEO Love trailer recap explanation")).toBe(true);
    expect(isRejectedRankingContent("watch free full movie youtube compilation")).toBe(true);
    expect(isRejectedRankingContent("Watch Free Drama TV Shows & Movies | Tubi")).toBe(true);
  });

  it("allows complete official dramas with cover, episode count and high confidence", () => {
    const enriched = enrichRankingResource(officialResource);
    expect(enriched.confidence_score).toBeGreaterThanOrEqual(70);
    expect(enriched.hot_score).toBeGreaterThan(0);
    expect(enriched.genre).toContain("Mafia");
    expect(isEligibleRankingResource(enriched)).toBe(true);
  });

  it("blocks non-official third-party videos even when they have views", () => {
    const enriched = enrichRankingResource({ ...officialResource, id: "dm:1", platformId: "dailymotion", verifiedOfficial: false, official_source: false, source_type: "third_party_database" });
    expect(isEligibleRankingResource(enriched)).toBe(false);
  });
});
