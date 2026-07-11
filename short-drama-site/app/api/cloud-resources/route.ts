import { NextRequest, NextResponse } from "next/server";
import { createCloudResource, listCloudResources } from "@/lib/repository";
import { cloudTypeFromUrl } from "@/lib/playback";
import type { CloudType } from "@/lib/types";

function isCloudType(value: unknown): value is CloudType {
  return value === "baidu" || value === "quark";
}

export async function GET() {
  return NextResponse.json({ resources: await listCloudResources() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { dramaId?: string; episode?: number; platform?: string; cloudType?: string; cloudUrl?: string };
    const cloudUrl = body.cloudUrl?.trim() ?? "";
    const detected = cloudTypeFromUrl(cloudUrl);
    const cloudType = isCloudType(body.cloudType) ? body.cloudType : detected;
    if (!cloudType) return NextResponse.json({ error: "只支持百度网盘或夸克网盘链接" }, { status: 400 });
    if (!cloudUrl.startsWith("https://")) return NextResponse.json({ error: "云盘链接必须是 HTTPS" }, { status: 400 });
    const resource = await createCloudResource({
      dramaId: body.dramaId,
      episode: Number.isFinite(body.episode) ? body.episode : undefined,
      platform: body.platform?.trim() || undefined,
      cloudType,
      cloudUrl,
      status: "saved",
    });
    return NextResponse.json({ resource });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存云盘资源失败" }, { status: 500 });
  }
}
