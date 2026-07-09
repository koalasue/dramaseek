import { NextResponse } from "next/server";
import { listPlatforms } from "@/lib/repository";
export async function GET() { return NextResponse.json({ platforms: await listPlatforms() }); }
