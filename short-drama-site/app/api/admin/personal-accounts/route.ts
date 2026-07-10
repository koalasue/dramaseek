import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listPersonalAccountConnections, upsertPersonalAccountConnection } from "@/lib/repository";
import type { PersonalAccountConnectionMode, PersonalAccountPlatform } from "@/lib/types";

const platforms = new Set(["reelshort", "dramabox", "shortmax", "goodshort", "flextv", "netshort", "tiktok"]);
const modes = new Set(["guest", "personal_account", "manual"]);

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json({ connections: await listPersonalAccountConnections() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await request.json().catch(() => null) as { platformId?: string; mode?: string; accountLabel?: string; note?: string } | null;
  if (!body?.platformId || !platforms.has(body.platformId)) return NextResponse.json({ error: "平台无效" }, { status: 400 });
  if (!body.mode || !modes.has(body.mode)) return NextResponse.json({ error: "连接方式无效" }, { status: 400 });
  const connection = await upsertPersonalAccountConnection({
    platformId: body.platformId as PersonalAccountPlatform,
    mode: body.mode as PersonalAccountConnectionMode,
    accountLabel: body.accountLabel?.slice(0, 80),
    note: body.note?.slice(0, 500),
  });
  return NextResponse.json({ connection });
}
