import { NextResponse } from "next/server";
import { setAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
export async function POST(request: Request) { const { password } = await request.json(); if (!verifyAdminPassword(String(password ?? ""))) return NextResponse.json({ error: "密码不正确" }, { status: 401 }); await setAdminSession(); return NextResponse.json({ ok: true }); }
