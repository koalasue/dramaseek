const blockedHosts = [
  "youtube.com", "youtu.be", "dailymotion.com", "tiktok.com",
  "reelshort.com", "dramabox.com", "netshort.com"
];
const mediaExtensions = [".mp4", ".webm", ".mov", ".m4v"];
const safeMimeTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

export interface DownloadInspection {
  allowed: boolean;
  reason?: string;
  url?: string;
  filename?: string;
  contentType?: string;
  contentLength?: number;
}

export function configuredDownloadHosts() {
  return (process.env.AUTHORIZED_DOWNLOAD_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
}

function isBlockedHost(hostname: string) {
  return blockedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function isPrivateHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(hostname);
}

export function validateAuthorizedMediaUrl(value: string): DownloadInspection {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return { allowed: false, reason: "只允许 HTTPS 媒体链接" };
    const hostname = url.hostname.toLowerCase();
    if (isPrivateHost(hostname)) return { allowed: false, reason: "不允许本地或内网地址" };
    if (isBlockedHost(hostname)) return { allowed: false, reason: "该平台不允许通过此工具抓取或下载" };
    const allowedHosts = configuredDownloadHosts();
    if (!allowedHosts.length) return { allowed: false, reason: "管理员尚未配置授权下载域名" };
    if (!allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return { allowed: false, reason: "该域名不在授权白名单中" };
    if (!mediaExtensions.some((extension) => url.pathname.toLowerCase().endsWith(extension))) return { allowed: false, reason: "只支持 MP4、WebM、MOV 和 M4V 直接文件链接" };
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "video.mp4").replace(/[^\p{L}\p{N}._ -]/gu, "_");
    return { allowed: true, url: url.toString(), filename };
  } catch {
    return { allowed: false, reason: "链接格式无效" };
  }
}

export function validateMediaResponse(contentType: string | null, contentLength: string | null): DownloadInspection {
  const normalizedType = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  if (!safeMimeTypes.includes(normalizedType)) return { allowed: false, reason: "服务器返回的不是受支持的视频文件" };
  const length = contentLength ? Number(contentLength) : undefined;
  const maxBytes = Number(process.env.MAX_DOWNLOAD_BYTES ?? 524_288_000);
  if (length && (!Number.isFinite(length) || length > maxBytes)) return { allowed: false, reason: "文件超过允许的大小限制" };
  return { allowed: true, contentType: normalizedType, contentLength: length };
}
