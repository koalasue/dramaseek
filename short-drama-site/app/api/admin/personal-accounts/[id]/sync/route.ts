import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { markPersonalAccountSynced } from "@/lib/repository";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "连接不存在" }, { status: 400 });
  const result = await markPersonalAccountSynced(id);
  return NextResponse.json({
    ...result,
    note: "个人同步只记录状态与统计；不会抓取、公开、下载或转存登录后/会员/DRM 内容。",
  });
}
