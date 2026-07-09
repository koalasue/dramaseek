import { afterEach, describe, expect, it } from "vitest";
import { validateAuthorizedMediaUrl, validateMediaResponse } from "@/lib/download-policy";

const originalHosts = process.env.AUTHORIZED_DOWNLOAD_HOSTS;
afterEach(() => { process.env.AUTHORIZED_DOWNLOAD_HOSTS = originalHosts; });

describe("authorized download policy", () => {
  it("rejects downloads when no authorized hosts are configured", () => { process.env.AUTHORIZED_DOWNLOAD_HOSTS = ""; expect(validateAuthorizedMediaUrl("https://media.example.com/video.mp4").allowed).toBe(false); });
  it("accepts a direct MP4 from an authorized host", () => { process.env.AUTHORIZED_DOWNLOAD_HOSTS = "media.example.com"; expect(validateAuthorizedMediaUrl("https://media.example.com/library/my-video.mp4")).toMatchObject({ allowed: true, filename: "my-video.mp4" }); });
  it("rejects platform extraction even if mistakenly allowlisted", () => { process.env.AUTHORIZED_DOWNLOAD_HOSTS = "youtube.com,dailymotion.com"; expect(validateAuthorizedMediaUrl("https://youtube.com/video.mp4").allowed).toBe(false); expect(validateAuthorizedMediaUrl("https://dailymotion.com/video.mp4").allowed).toBe(false); });
  it("rejects webpages, playlists and private addresses", () => { process.env.AUTHORIZED_DOWNLOAD_HOSTS = "media.example.com,127.0.0.1"; expect(validateAuthorizedMediaUrl("https://media.example.com/watch/123").allowed).toBe(false); expect(validateAuthorizedMediaUrl("https://media.example.com/list.m3u8").allowed).toBe(false); expect(validateAuthorizedMediaUrl("https://127.0.0.1/video.mp4").allowed).toBe(false); });
  it("checks MIME type and maximum file size", () => { process.env.MAX_DOWNLOAD_BYTES = "1000"; expect(validateMediaResponse("video/mp4", "999").allowed).toBe(true); expect(validateMediaResponse("text/html", "100").allowed).toBe(false); expect(validateMediaResponse("video/mp4", "1001").allowed).toBe(false); });
});
