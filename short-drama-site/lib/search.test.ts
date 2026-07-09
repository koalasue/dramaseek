import { describe, expect, it } from "vitest";
import { dramas, platforms } from "@/lib/seed";
import { normalizeText, searchDramas, similarity } from "@/lib/search";

describe("search", () => {
  const indexedDramas = dramas.map((drama) => drama.id === "d6" ? { ...drama, resources: [{ id: "test-resource", platformId: "netshort", url: "https://netshort.com/test-only", language: "en" as const, region: "Global", status: "active" as const, official: true, checkedAt: "2026-07-07T00:00:00Z", sourceProof: "Test fixture only" }] } : drama);
  it("normalizes punctuation and case", () => { expect(normalizeText("Goodbye, My CEO")).toBe("goodbyemyceo"); });
  it("finds a Chinese alias in verified indexed data", () => { expect(searchDramas(indexedDramas, platforms, { query: "狮子的俘虏" })[0]?.slug).toBe("the-lions-captive"); });
  it("finds a partial English title in verified indexed data", () => { expect(searchDramas(indexedDramas, platforms, { query: "Lion's Captive" })[0]?.id).toBe("d6"); });
  it("does not expose the removed disputed manual source", () => { expect(searchDramas(dramas, platforms, { query: "The Lion's Captive" })).toHaveLength(0); });
  it("tolerates a small typo", () => { expect(similarity("Forbidden Alpha", "Forbiden Alpha")).toBeGreaterThan(.7); });
  it("does not invent TikTok results without a verified title resource", () => { expect(searchDramas(dramas, platforms, { platform: "tiktok" })).toHaveLength(0); });
  it("does not expose unavailable resources in platform filtering", () => { const altered = [{ ...dramas[0], resources: dramas[0].resources.map((resource) => ({ ...resource, status: "unavailable" as const })) }]; expect(searchDramas(altered, platforms, { platform: "reelshort" })).toHaveLength(0); });
});
