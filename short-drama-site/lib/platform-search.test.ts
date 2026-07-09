import { describe, expect, it } from "vitest";
import { platforms } from "@/lib/seed";
import { getPlatformSearchUrl } from "@/lib/platform-search";

describe("platform search fallbacks", () => {
  it("builds a localized Dailymotion search URL for an unindexed title", () => { const platform = platforms.find((item) => item.slug === "dailymotion")!; expect(getPlatformSearchUrl(platform, "The Lion's Captive")).toContain("dailymotion.com/tw/search/"); });
  it("adds full-episode context and excludes commentary terms", () => { const platform = platforms.find((item) => item.slug === "tiktok")!; const url = decodeURIComponent(getPlatformSearchUrl(platform, "Hidden Heiress")); expect(url).toContain("full episode"); expect(url).toContain("-review"); });
});
