import { describe, expect, it } from "vitest";
import { validateResourceUrl } from "@/lib/url-policy";

describe("resource URL policy", () => {
  it("accepts all supported official platform domains", () => {
    ["https://youtube.com/watch?v=1", "https://reelshort.com/title", "https://dramabox.com/title", "https://netshort.com/title", "https://dailymotion.com/video/x", "https://tiktok.com/@official/video/1"].forEach((url) => expect(validateResourceUrl(url).valid).toBe(true));
  });
  it("rejects unsupported domains", () => { expect(validateResourceUrl("https://example.com/watch").valid).toBe(false); });
  it("accepts direct HTTPS video links for controllable online playback", () => {
    expect(validateResourceUrl("https://media.example.com/file.mp4")).toMatchObject({ valid: true, platform: expect.objectContaining({ id: "direct" }) });
    expect(validateResourceUrl("https://cdn.example.com/file.m3u8")).toMatchObject({ valid: true, platform: expect.objectContaining({ id: "direct" }) });
  });
  it("rejects subtitle files as primary watch URLs", () => { expect(validateResourceUrl("https://media.example.com/file.vtt").valid).toBe(false); expect(validateResourceUrl("https://media.example.com/file.srt").valid).toBe(false); });
  it("rejects non-HTTPS links", () => { expect(validateResourceUrl("http://youtube.com/watch").valid).toBe(false); });
});
