import { NextRequest, NextResponse } from "next/server";
import { listDramas, listPlatforms } from "@/lib/repository";
import { searchDramas } from "@/lib/search";
import type { Language } from "@/lib/types";

export async function GET(request: NextRequest) {
  const [dramas, platforms] = await Promise.all([listDramas(), listPlatforms()]);
  const params = request.nextUrl.searchParams;
  const results = searchDramas(dramas, platforms, { query: params.get("q") ?? "", platform: params.get("platform") ?? "all", language: (params.get("language") ?? "all") as Language | "all" });
  return NextResponse.json({ results, count: results.length });
}
