import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type DownloadTaskStatus = "pending" | "processing" | "completed" | "failed";

export interface DownloadVideoInfo {
  title: string;
  thumbnail?: string;
  duration?: number;
  quality?: string;
  download_url?: string;
  downloadUrl?: string;
}

export interface DownloadTask {
  id: string;
  url: string;
  status: DownloadTaskStatus;
  progress: number;
  quality?: string;
  created_at: string;
  info?: DownloadVideoInfo;
  error?: string;
}

type YtDlpFormat = {
  url?: string;
  format_id?: string;
  format_note?: string;
  height?: number;
  width?: number;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
};

type YtDlpJson = {
  title?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
  formats?: YtDlpFormat[];
};

const supportedHosts = ["youtube.com", "youtu.be", "dailymotion.com"];
export const YTDLP_NOT_INSTALLED_MESSAGE = "yt-dlp not installed, please install it with brew install yt-dlp";

export function ytdlpBinary() {
  return process.env.YTDLP_BIN || "yt-dlp";
}

export async function checkYtDlpAvailable() {
  try {
    const { stdout } = await execFileAsync(ytdlpBinary(), ["--version"], {
      timeout: 8_000,
      maxBuffer: 1024 * 1024,
    });
    return { available: true as const, version: stdout.trim() };
  } catch {
    return { available: false as const, error: YTDLP_NOT_INSTALLED_MESSAGE };
  }
}

export function validateDownloadSource(value: string, ownershipConfirmed = false) {
  if (!ownershipConfirmed) return { valid: false as const, error: "必须确认你拥有该内容或已取得下载/备份授权。" };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return { valid: false as const, error: "只支持 HTTPS 视频页面。" };
    if (url.username || url.password) return { valid: false as const, error: "链接不能包含账号或密码。" };
    const host = url.hostname.toLowerCase();
    if (!supportedHosts.some((item) => host === item || host.endsWith(`.${item}`))) {
      return { valid: false as const, error: "当前 yt-dlp 解析优先支持 YouTube 和 Dailymotion 公开视频。" };
    }
    return { valid: true as const, url: url.toString() };
  } catch {
    return { valid: false as const, error: "链接格式无效。" };
  }
}

function chooseFormat(formats: YtDlpFormat[] = []) {
  const candidates = formats
    .filter((item) => item.url && item.vcodec !== "none" && item.acodec !== "none")
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  return candidates[0] ?? formats.find((item) => item.url);
}

export async function inspectWithYtDlp(url: string): Promise<DownloadVideoInfo> {
  const { stdout } = await execFileAsync(ytdlpBinary(), [
    "--dump-single-json",
    "--no-playlist",
    "--skip-download",
    "--no-warnings",
    url,
  ], {
    timeout: 45_000,
    maxBuffer: 12 * 1024 * 1024,
  });
  const payload = JSON.parse(stdout) as YtDlpJson;
  const format = chooseFormat(payload.formats);
  const height = format?.height ? `${format.height}p` : undefined;
  const downloadUrl = format?.url ?? payload.webpage_url ?? url;
  return {
    title: payload.title || "Untitled video",
    thumbnail: payload.thumbnail,
    duration: payload.duration,
    quality: height ?? format?.format_note ?? format?.format_id,
    download_url: downloadUrl,
    downloadUrl,
  };
}
