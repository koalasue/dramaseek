import { NextRequest, NextResponse } from "next/server";
import { listDramas } from "@/lib/repository";
function authorized(request: NextRequest) { const secret = process.env.CRON_SECRET; return !secret || request.headers.get("authorization") === `Bearer ${secret}`; }
export async function GET(request: NextRequest) { if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 }); const resources = (await listDramas()).flatMap((drama) => drama.resources); return NextResponse.json({ ok: true, checked: resources.length, active: resources.filter((item) => item.status === "active").length, limited: resources.filter((item) => item.status === "limited").length }); }
