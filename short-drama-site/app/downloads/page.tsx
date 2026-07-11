import Link from "next/link";

export default function DownloadsRetiredPage() {
  return <section className="page-shell py-16">
    <div className="surface mx-auto max-w-xl rounded-2xl border line p-8 text-center">
      <h1 className="text-xl font-semibold">本地下载功能已关闭</h1>
      <p className="mt-2 text-sm leading-6 text-muted">DramaSeek 现在专注于短剧搜索、资源聚合和个人云盘备份管理。需要长期保存时，请在短剧详情页记录百度网盘或夸克网盘入口。</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/library" className="focus-ring accent-bg rounded-xl px-5 py-3 text-sm font-semibold">进入 My Library</Link>
        <Link href="/" className="focus-ring rounded-xl border line px-5 py-3 text-sm font-semibold">返回搜索</Link>
      </div>
    </div>
  </section>;
}
