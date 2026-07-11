import type { PlaybackStatus, PlayType } from "@/lib/types";

export type WatchMode = "online_player" | "external_platform" | "cloud_backup";

export interface SourceCapability {
  mode: WatchMode;
  can_play: boolean | "external";
  can_extract_audio: boolean;
  can_generate_subtitle: boolean;
  can_cloud_backup: boolean;
  subtitle_sources: Array<"original_track" | "audio_asr" | "video_ocr">;
  reason: string;
}

const externalOnlyPlatforms = new Set(["dailymotion", "reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv", "shortdrama", "jowo", "minishort", "dramaflows", "tiktok"]);
const realtimeAiSubtitleEnabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME_AI_SUBTITLE === "true";

export function detectSourceCapability(input: { platformId: string; playType: PlayType; status: PlaybackStatus; url: string }): SourceCapability {
  if (input.playType === "cloud") {
    return {
      mode: "cloud_backup",
      can_play: "external",
      can_extract_audio: false,
      can_generate_subtitle: false,
      can_cloud_backup: true,
      subtitle_sources: [],
      reason: "云盘观看由百度网盘或夸克网盘播放器处理字幕。",
    };
  }

  if (input.status === "expired" || input.status === "private" || input.playType === "unavailable") {
    return {
      mode: "external_platform",
      can_play: false,
      can_extract_audio: false,
      can_generate_subtitle: false,
      can_cloud_backup: true,
      subtitle_sources: [],
      reason: "资源已失效或不可公开播放。",
    };
  }

  if (input.playType === "direct") {
    return {
      mode: "online_player",
      can_play: true,
      can_extract_audio: true,
      can_generate_subtitle: realtimeAiSubtitleEnabled,
      can_cloud_backup: true,
      subtitle_sources: ["original_track", "audio_asr", "video_ocr"],
      reason: realtimeAiSubtitleEnabled ? "可控 video 源，支持字幕轨、音频 ASR 和视频画面 OCR。" : "可控 video 源会优先使用原生字幕轨；实时 AI 字幕接口已预留但默认关闭。",
    };
  }

  if (input.playType === "embed" || externalOnlyPlatforms.has(input.platformId) || input.status === "login_required") {
    return {
      mode: "external_platform",
      can_play: input.playType === "embed" ? true : "external",
      can_extract_audio: false,
      can_generate_subtitle: false,
      can_cloud_backup: true,
      subtitle_sources: [],
      reason: "第三方 iframe 或官方平台受同源、登录、广告和播放器策略限制，只作为原始播放/预览入口。",
    };
  }

  return {
    mode: "external_platform",
    can_play: "external",
    can_extract_audio: false,
    can_generate_subtitle: false,
    can_cloud_backup: true,
    subtitle_sources: [],
    reason: "暂未确认该来源可被 DramaSeek 控制，默认作为外部平台处理。",
  };
}
