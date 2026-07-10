import { NextResponse } from "next/server";
import { getDramaBySlug } from "@/lib/repository";
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) { const drama = await getDramaBySlug((await params).slug); return drama ? NextResponse.json(drama) : NextResponse.json({ error: "未找到剧目" }, { status: 404 }); }
