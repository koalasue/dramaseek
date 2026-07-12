import { NextRequest, NextResponse } from "next/server";
import { createCloudResource, listCloudResources } from "@/lib/repository";
import { validateCloudResourceInput } from "@/lib/cloud-resource-policy";

export async function GET() {
  return NextResponse.json({ resources: await listCloudResources() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { dramaId?: string; episode?: number; platform?: string; cloudType?: string; cloudUrl?: string; sourceUrl?: string; status?: string };
    const validation = validateCloudResourceInput(body);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
    const resource = await createCloudResource({
      dramaId: body.dramaId,
      episode: Number.isFinite(body.episode) ? body.episode : undefined,
      platform: body.platform?.trim() || undefined,
      cloudType: validation.cloudType,
      cloudUrl: validation.cloudUrl,
      status: validation.status,
    });
    return NextResponse.json({ resource });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存云盘资源失败" }, { status: 500 });
  }
}
