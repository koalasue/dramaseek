import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createSubmission } from "@/lib/repository";

type ImportItem = {
  url?: string;
  title?: string;
  note?: string;
  platform?: string;
  source?: string;
};

function isSafeOfficialUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && [
      "youtube.com", "youtu.be", "reelshort.com", "dramabox.com", "dramaboxdb.com", "netshort.com", "dailymotion.com", "tiktok.com"
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { items?: ImportItem[] } | ImportItem[] | null;
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!items?.length) return NextResponse.json({ imported: 0, skipped: 0, errors: ["没有可导入的数据"] }, { status: 400 });

  const supabase = getSupabaseServer();
  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const item of items.slice(0, 100)) {
    const url = item.url?.trim();
    if (!url || !isSafeOfficialUrl(url)) { results.skipped += 1; continue; }
    const note = [item.note, item.platform && `平台：${item.platform}`, item.source && `来源：${item.source}`].filter(Boolean).join("\n");
    try {
      if (supabase) {
        const { error } = await supabase.from("submissions").upsert({
          url,
          title: item.title?.trim() || null,
          note: note || null,
          contact: "agent-reach/import",
          status: "pending",
        }, { onConflict: "url", ignoreDuplicates: true });
        if (error) throw error;
      } else {
        await createSubmission({ url, title: item.title, note, contact: "agent-reach/import" });
      }
      results.imported += 1;
    } catch (error) {
      results.skipped += 1;
      results.errors.push(error instanceof Error ? error.message : `导入失败：${url}`);
    }
  }

  return NextResponse.json(results);
}
