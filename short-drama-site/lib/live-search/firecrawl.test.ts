import { describe, expect, it } from "vitest";
import { filterFirecrawlResults } from "@/lib/live-search/firecrawl";

describe("Firecrawl short-drama discovery", () => {
  it("accepts an exact drama page on an official platform domain", () => {
    const result = filterFirecrawlResults([{ title: "The Lion's Captive | ReelShort", url: "https://www.reelshort.com/movie/the-lions-captive", description: "Watch full episodes online" }], "The Lion's Captive");
    expect(result[0]).toMatchObject({ platformId: "reelshort", verifiedOfficial: true, discoverySource: "firecrawl" });
  });

  it("rejects commentary and unrelated titles", () => {
    expect(filterFirecrawlResults([{ title: "The Lion's Captive Recap", url: "https://dramabox.com/movie/lion", description: "Story explained" }], "The Lion's Captive")).toHaveLength(0);
    expect(filterFirecrawlResults([{ title: "Another Drama", url: "https://netshort.com/movie/other" }], "The Lion's Captive")).toHaveLength(0);
  });

  it("rejects lookalike and generic search domains", () => {
    expect(filterFirecrawlResults([{ title: "The Lion's Captive", url: "https://reelshort.example/movie/lion" }], "The Lion's Captive")).toHaveLength(0);
    expect(filterFirecrawlResults([{ title: "The Lion's Captive", url: "https://reelshort.com/search?q=lion" }], "The Lion's Captive")).toHaveLength(0);
  });
});
