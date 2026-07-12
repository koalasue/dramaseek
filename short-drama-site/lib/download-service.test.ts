import { describe, expect, it } from "vitest";
import { validateDownloadSource, ytdlpBinary } from "@/lib/download-service";

describe("validateDownloadSource", () => {
  it("uses YTDLP_BIN or falls back to yt-dlp without hardcoding a local path", () => {
    const original = process.env.YTDLP_BIN;
    delete process.env.YTDLP_BIN;
    expect(ytdlpBinary()).toBe("yt-dlp");
    process.env.YTDLP_BIN = "/opt/homebrew/bin/yt-dlp";
    expect(ytdlpBinary()).toBe("/opt/homebrew/bin/yt-dlp");
    if (original === undefined) {
      delete process.env.YTDLP_BIN;
    } else {
      process.env.YTDLP_BIN = original;
    }
  });

  it("requires ownership or backup authorization confirmation", () => {
    expect(validateDownloadSource("https://www.youtube.com/watch?v=abc123")).toEqual({
      valid: false,
      error: "必须确认你拥有该内容或已取得下载/备份授权。",
    });
  });

  it("accepts supported public video platforms when confirmed", () => {
    expect(validateDownloadSource("https://www.youtube.com/watch?v=abc123", true)).toMatchObject({
      valid: true,
      url: "https://www.youtube.com/watch?v=abc123",
    });
    expect(validateDownloadSource("https://www.dailymotion.com/video/xaiwylm", true)).toMatchObject({
      valid: true,
      url: "https://www.dailymotion.com/video/xaiwylm",
    });
  });

  it("rejects unsupported hosts and non-https links", () => {
    expect(validateDownloadSource("http://www.youtube.com/watch?v=abc123", true)).toMatchObject({
      valid: false,
      error: "只支持 HTTPS 视频页面。",
    });
    expect(validateDownloadSource("https://example.com/video.mp4", true)).toMatchObject({
      valid: false,
      error: "当前 yt-dlp 解析优先支持 YouTube 和 Dailymotion 公开视频。",
    });
  });
});
