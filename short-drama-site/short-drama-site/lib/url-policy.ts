import { platforms } from "@/lib/seed";

const blockedSuffixes = [".mp4", ".m3u8", ".mpd", ".mkv", ".webm"];

export function validateResourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return { valid: false, reason: "只接受 HTTPS 链接" };
    if (url.username || url.password) return { valid: false, reason: "链接不能包含认证信息" };
    if (blockedSuffixes.some((suffix) => url.pathname.toLowerCase().endsWith(suffix))) {
      return { valid: false, reason: "不接受视频文件或流媒体直链" };
    }
    const platform = platforms.find((item) => url.hostname === item.domain || url.hostname.endsWith(`.${item.domain}`));
    if (!platform) return { valid: false, reason: "暂不支持这个平台" };
    return { valid: true, platform };
  } catch {
    return { valid: false, reason: "链接格式无效" };
  }
}
