import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t line py-10">
      <div className="page-shell grid gap-8 text-sm md:grid-cols-[1fr_auto] md:items-end">
        <div><p className="font-semibold">短剧寻址</p><p className="mt-2 max-w-xl text-muted">只整理公开、正版的观看入口。本站不托管视频，也不提供绕过付费或数字版权保护的下载方式。</p></div>
        <div className="flex flex-wrap gap-5 text-muted"><Link href="/submit">提交资源</Link><Link href="/about#copyright">版权投诉</Link><Link href="/admin">管理后台</Link></div>
      </div>
    </footer>
  );
}
