import { describe, expect, it } from "vitest";
import { buildDramaMetadata, cleanDramaTitle, shortDescription } from "@/lib/rankings/metadata";
import type { LiveSearchResource } from "@/lib/types";

const resource: LiveSearchResource = {
  id: "reelshort:meta",
  platformId: "reelshort",
  title: "Never Divorce a Secret Billionaire Heiress EP1-EP20 #reelshort #drama",
  url: "https://www.reelshort.com/full-episodes/never-divorce-a-secret-billionaire-heiress-1234",
  thumbnailUrl: "https://example.com/poster.jpg",
  uploader: "ReelShort",
  contentType: "full_series",
  verifiedOfficial: true,
  description: "Watch full episodes on ReelShort. #shortdrama",
};

describe("ranking drama metadata", () => {
  it("cleans SEO title fragments, episode ranges and hashtags", () => {
    expect(cleanDramaTitle(resource.title)).toBe("Never Divorce a Secret Billionaire Heiress");
    expect(cleanDramaTitle("I accept you, Jackson! [Fated to My Forbidden Alpha]")).toBe("Fated to My Forbidden Alpha");
    expect(cleanDramaTitle("What's that supposed to mean? [Goodbye, My CEO]")).toBe("Goodbye, My CEO");
    expect(cleanDramaTitle("She's my employee. My responsibility! [Goodbye, My CEO]")).toBe("Goodbye, My CEO");
  });

  it("generates useful metadata for ranking cards", () => {
    const metadata = buildDramaMetadata(resource);
    expect(metadata.title).toBe("Never Divorce a Secret Billionaire Heiress");
    expect(metadata.episodes).toBe(20);
    expect(metadata.genre).toContain("Billionaire");
    expect(metadata.description).toContain("豪门");
  });

  it("does not reuse low quality SEO descriptions", () => {
    expect(shortDescription({ title: resource.title, description: "Watch free full movie now", genre: ["Romance"] })).toContain("海外热门竖屏短剧");
  });
});
