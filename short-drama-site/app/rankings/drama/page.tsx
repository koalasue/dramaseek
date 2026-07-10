import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Fire, PlayCircle, TrendDown, TrendUp } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "短剧详情 | DramaSeek" };

type Params = Record<string, string | string[] | undefined>;

function value(params: Params, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] ?? "" : item ?? "";
}

function trendLabel(value: string) {
  if (value === "UP") return "Rising";
  if (value === "DOWN") return "Cooling";
  return "Stable";
}

function TrendIcon({ value }: { value: string }) {
  if (value === "UP") return <TrendUp size={16} weight="bold"/>;
  if (value === "DOWN") return <TrendDown size={16} weight="bold"/>;
  return <Fire size={16} weight="fill"/>;
}

export default async function RankingDramaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const title = value(params, "title") || "Untitled Drama";
  const platform = value(params, "platform") || "all";
  const cover = value(params, "cover");
  const description = value(params, "description") || "该短剧来自已验证排行榜资源，详情以官方平台页面为准。";
  const genres = value(params, "genre").split(",").filter(Boolean);
  const episodes = value(params, "episodes");
  const hot = value(params, "hot") || "0";
  const trend = value(params, "trend") || "STABLE";
  const source = value(params, "source");
  const searchHref = `/?q=${encodeURIComponent(title)}&platform=${encodeURIComponent(platform)}`;

  return <main className="page-shell py-4 md:py-6">
    <Link href="/rankings" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-sm font-medium"><ArrowLeft size={16}/>返回排行榜</Link>
    <section className="surface mt-4 overflow-hidden rounded-xl border line">
      <div className="grid gap-4 p-4 md:grid-cols-[180px_minmax(0,1fr)] md:p-5">
        <div className="relative mx-auto aspect-[5/7] w-[150px] overflow-hidden rounded-xl bg-[color:var(--surface-strong)] md:w-full">
          {cover ? <img src={cover} alt={`${title} cover`} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-xs text-muted">No cover</div>}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
            <span className="rounded-md bg-[color:var(--surface-strong)] px-2 py-1">{platform}</span>
            {episodes && <span className="rounded-md bg-[color:var(--surface-strong)] px-2 py-1">{episodes} Episodes</span>}
            {genres.map((item) => <span key={item} className="rounded-md bg-[color:var(--surface-strong)] px-2 py-1">{item}</span>)}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em] md:text-3xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{description}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 md:max-w-xl">
            <div className="surface-strong rounded-xl border line p-3"><p className="text-xs text-muted">Hot Score</p><p className="mt-1 inline-flex items-center gap-1 text-lg font-bold text-red-700"><Fire size={18} weight="fill"/>Hot {hot}</p><p className="mt-1 text-[11px] text-muted">综合平台排名、观看趋势、热度增长和更新时间。</p></div>
            <div className="surface-strong rounded-xl border line p-3"><p className="text-xs text-muted">Trend</p><p className="mt-1 inline-flex items-center gap-1 text-lg font-bold"><TrendIcon value={trend}/>{trendLabel(trend)}</p><p className="mt-1 text-[11px] text-muted">用于判断该剧是升温、稳定还是回落。</p></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={searchHref} className="focus-ring pressable inline-flex min-h-10 items-center gap-2 rounded-lg accent-bg px-4 text-sm font-semibold"><PlayCircle size={17} weight="fill"/>查找播放资源</Link>
            {source && <a href={source} target="_blank" rel="noreferrer" className="focus-ring pressable inline-flex min-h-10 items-center gap-2 rounded-lg border line px-4 text-sm font-semibold">打开官方来源<ArrowRight size={16}/></a>}
          </div>
        </div>
      </div>
    </section>

    <section className="mt-4 grid gap-3 md:grid-cols-3">
      {genres.slice(0, 3).map((item) => <Link key={item} href={`/rankings?genre=${encodeURIComponent(item)}`} className="surface rounded-xl border line p-4 hover:bg-[color:var(--surface-strong)]">
        <p className="text-xs text-muted">Similar Genre</p>
        <h2 className="mt-1 text-base font-semibold">{item} Dramas</h2>
        <p className="mt-1 text-xs leading-5 text-muted">继续发现同类型热门海外短剧。</p>
      </Link>)}
    </section>
  </main>;
}
