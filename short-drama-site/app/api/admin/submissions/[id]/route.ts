import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { status } = await request.json();
  if (!["approved", "rejected"].includes(status)) return NextResponse.json({ error: "状态无效" }, { status: 400 });
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ ok: true, demo: true });
  const { error } = await supabase.from("submissions").update({ status }).eq("id", (await params).id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
