import { platforms } from "@/lib/seed";
import type { Platform } from "@/lib/types";

const blockedSuffixes = [".mp4", ".m3u8", ".mpd", ".mkv", ".webm"];
const extraDomains: Record<string, string[]> = {
  dramabox: ["dramaboxdb.com"],
  shortmax: ["shortmax.tv"],
  flextv: ["flextv.co"],
};
export const cloudPlatforms: Platform[] = [
  { id: "baidu", slug: "baidu", name: "百度网盘", domain: "pan.baidu.com", color: "#d94f45", offlineNote: "仅支持用户拥有权限的网盘页面；本站不会绕过提取码、登录或会员限制。" },
  { id: "quark", slug: "quark", name: "夸克网盘", domain: "pan.quark.cn", color: "#c8433a", offlineNote: "仅支持用户拥有权限的网盘页面；本站不会绕过提取码、登录或会员限制。" },
];
const cloudExtraDomains: Record<string, string[]> = {
  baidu: ["yun.baidu.com"],
  quark: ["drive.quark.cn"],
};

export function validateResourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return { valid: false, reason: "只接受 HTTPS 链接" };
    if (url.username || url.password) return { valid: false, reason: "链接不能包含认证信息" };
    if (blockedSuffixes.some((suffix) => url.pathname.toLowerCase().endsWith(suffix))) {
      return { valid: false, reason: "不接受视频文件或流媒体直链" };
    }
    const platform = [...platforms, ...cloudPlatforms].find((item) => [item.domain, ...(extraDomains[item.id] ?? []), ...(cloudExtraDomains[item.id] ?? [])].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)));
    if (!platform) return { valid: false, reason: "暂不支持这个平台" };
    return { valid: true, platform };
  } catch {
    return { valid: false, reason: "链接格式无效" };
  }
}
