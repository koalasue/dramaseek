import { NextRequest, NextResponse } from "next/server";
import { adapters } from "@/lib/adapters";
function authorized(request: NextRequest) { const secret = process.env.CRON_SECRET; return !secret || request.headers.get("authorization") === `Bearer ${secret}`; }
export async function GET(request: NextRequest) { if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 }); const summaries = await Promise.all(adapters.map(async (adapter) => ({ platform: adapter.platformId, discovered: (await adapter.discover()).length }))); return NextResponse.json({ ok: true, summaries, note: "适配器只使用已配置的官方 API、RSS 或允许采集的公开元数据。" }); }
