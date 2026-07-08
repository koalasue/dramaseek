import { describe, expect, it } from "vitest";
import { filterDailymotionVideos, matchesExactDramaTitle } from "@/lib/live-search/dailymotion";

const video = { id: "x1", title: "The Lion's Captive - FULL | Reelshort", description: "#shortdrama", duration: 2826, url: "https://www.dailymotion.com/video/x1", thumbnail_360_url: "https://s1.dmcdn.net/x360", "owner.username": "Publisher" };

describe("Dailymotion live short-drama search", () => {
  it("preserves the original English title match", () => { expect(matchesExactDramaTitle(video.title, "The Lion's Captive")).toBe(true); });
  it("accepts a full drama and maps its real video URL", () => { const result = filterDailymotionVideos([video], "The Lion's Captive"); expect(result[0]).toMatchObject({ title: video.title, url: video.url, contentType: "full_series" }); });
  it("does not mix a sequel into the original title", () => { expect(filterDailymotionVideos([{ ...video, title: "The Lion's Captive 2" }], "The Lion's Captive")).toHaveLength(0); });
  it("removes explanation and trailer content", () => { expect(filterDailymotionVideos([{ ...video, title: "The Lion's Captive Review" }, { ...video, id: "x2", title: "The Lion's Captive Trailer" }], "The Lion's Captive")).toHaveLength(0); });
  it("removes deleted, private and non-embeddable videos", () => { expect(filterDailymotionVideos([{ ...video, status: "deleted" }, { ...video, id: "x2", private: true }, { ...video, id: "x3", allow_embed: false }], "The Lion's Captive")).toHaveLength(0); });
  it("deduplicates identical uploads by title and duration", () => { expect(filterDailymotionVideos([video, { ...video, id: "x2" }], "The Lion's Captive")).toHaveLength(1); });
});
