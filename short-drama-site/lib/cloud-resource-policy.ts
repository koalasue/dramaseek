import { cloudTypeFromUrl } from "@/lib/playback";
import type { CloudType } from "@/lib/types";

function isCloudType(value: unknown): value is CloudType {
  return value === "baidu" || value === "quark";
}

const cloudHome: Record<CloudType, string> = {
  baidu: "https://pan.baidu.com/",
  quark: "https://pan.quark.cn/",
};

export function validateCloudResourceInput(input: { cloudType?: string; cloudUrl?: string; sourceUrl?: string; status?: string }) {
  const cloudUrl = input.cloudUrl?.trim() ?? "";
  const detected = cloudTypeFromUrl(cloudUrl);
  const cloudType = isCloudType(input.cloudType) ? input.cloudType : detected;
  const pending = input.status === "processing";

  if (pending) {
    if (!cloudType) return { valid: false as const, error: "请选择百度网盘或夸克网盘，用于标记后续补链目标。" };
    const sourceUrl = input.sourceUrl?.trim() || cloudUrl || cloudHome[cloudType];
    if (!sourceUrl.startsWith("https://")) return { valid: false as const, error: "待补记录需要 HTTPS 来源地址或云盘入口。" };
    return { valid: true as const, cloudType, cloudUrl: sourceUrl, status: "processing" as const };
  }

  if (!cloudUrl) return { valid: false as const, error: "请先粘贴你已经保存好的云盘分享链接" };
  if (!cloudUrl.startsWith("https://")) return { valid: false as const, error: "云盘链接必须是 HTTPS。请从百度网盘或夸克网盘复制分享链接。" };
  if (!detected) return { valid: false as const, error: "这不是百度网盘或夸克网盘链接。请先在网盘里完成保存/分享，再粘贴 pan.baidu.com 或 pan.quark.cn 链接。" };
  if (!cloudType) return { valid: false as const, error: "请选择百度网盘或夸克网盘" };
  if (detected !== cloudType) return { valid: false as const, error: `链接类型与选择不一致。当前链接识别为${detected === "baidu" ? "百度网盘" : "夸克网盘"}。` };

  return { valid: true as const, cloudType, cloudUrl, status: "saved" as const };
}
