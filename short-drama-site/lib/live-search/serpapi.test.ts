import { describe, expect, it } from "vitest";
import { isOfficialPlatformUrl, isSupportedOfficialUrl } from "@/lib/live-search/serpapi";

describe("SerpAPI official platform domain guard", () => {
  it("accepts only the requested platform domains", () => {
    expect(isOfficialPlatformUrl("https://www.dramabox.com/movie/my-drama", "dramabox")).toBe(true);
    expect(isOfficialPlatformUrl("https://dramaboxdb.com/movie/my-drama", "dramabox")).toBe(true);
    expect(isOfficialPlatformUrl("https://tubitv.com/series/watch-free-drama-tv-shows", "dramabox")).toBe(false);
    expect(isOfficialPlatformUrl("https://example.com/dramabox/movie", "dramabox")).toBe(false);
  });

  it("recognizes supported official short-drama platforms only", () => {
    expect(isSupportedOfficialUrl("https://www.reelshort.com/full-episodes/my-drama")).toBe(true);
    expect(isSupportedOfficialUrl("https://www.goodshort.com/drama/my-drama")).toBe(true);
    expect(isSupportedOfficialUrl("https://www.tubi.tv/movies/drama")).toBe(false);
  });
});
