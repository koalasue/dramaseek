import { describe, expect, it } from "vitest";
import { detectSourceCapability } from "@/lib/source-capability";

describe("source capability detection", () => {
  it("keeps realtime AI subtitle disabled by default for controllable direct video", () => {
    expect(detectSourceCapability({ platformId: "media", playType: "direct", status: "available", url: "https://media.example.com/a.mp4" })).toMatchObject({
      mode: "online_player",
      can_play: true,
      can_extract_audio: true,
      can_generate_subtitle: false,
    });
  });

  it("treats Dailymotion iframe as preview only", () => {
    expect(detectSourceCapability({ platformId: "dailymotion", playType: "embed", status: "available", url: "https://www.dailymotion.com/video/x" })).toMatchObject({
      mode: "external_platform",
      can_play: true,
      can_extract_audio: false,
      can_generate_subtitle: false,
      can_cloud_backup: true,
    });
  });

  it("keeps cloud backup outside AI subtitles", () => {
    expect(detectSourceCapability({ platformId: "baidu", playType: "cloud", status: "available", url: "https://pan.baidu.com/s/1" })).toMatchObject({
      mode: "cloud_backup",
      can_generate_subtitle: false,
    });
  });
});
