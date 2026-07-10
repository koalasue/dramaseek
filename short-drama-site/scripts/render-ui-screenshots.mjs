import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/yyr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const outDir = path.resolve("outputs");

function cover(seed, title) {
  const colors = [
    ["#2f1f1b", "#c84f42"],
    ["#182033", "#6478b8"],
    ["#241a2d", "#b665a2"],
    ["#1f2a22", "#d6a857"],
    ["#2b2029", "#e26b5e"],
    ["#17232c", "#73a7b8"],
  ][seed % 6];
  const safe = title.replace(/[<&>"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="260" viewBox="0 0 180 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="180" height="260" rx="16" fill="url(#g)"/><circle cx="138" cy="48" r="36" fill="rgba(255,255,255,.18)"/><rect x="18" y="36" width="80" height="112" rx="18" fill="rgba(255,255,255,.13)"/><text x="18" y="190" fill="#fffaf5" font-family="Arial, sans-serif" font-size="19" font-weight="700">${safe.split(" ").slice(0, 2).join(" ")}</text><text x="18" y="215" fill="rgba(255,250,245,.76)" font-family="Arial, sans-serif" font-size="12">SHORT DRAMA</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const dramas = [
  ["The Double Life of My Billionaire Husband", "ReelShort", "Romance", "50 Episodes", 96, "Rising"],
  ["My Mafia Husband", "ReelShort", "Mafia", "80 Episodes", 94, "Rising"],
  ["Never Divorce a Secret Billionaire Heiress", "DramaBox", "CEO", "72 Episodes", 91, "Stable"],
  ["Fated to My Forbidden Alpha", "NetShort", "Werewolf", "63 Episodes", 89, "Rising"],
  ["The CEO's Mute Bride", "ShortMax", "Marriage", "61 Episodes", 86, "Stable"],
  ["Goodbye, My CEO", "GoodShort", "Revenge", "45 Episodes", 82, "Cooling"],
  ["Contract Marriage With The Billionaire", "FlexTV", "Billionaire", "70 Episodes", 80, "Stable"],
  ["Hidden Heiress Returns", "DramaBox", "Revenge", "58 Episodes", 78, "Rising"],
];

const css = `
  :root{--bg:#f4f3ef;--surface:#fbfaf7;--strong:#ebe9e2;--ink:#171816;--muted:#666861;--line:#d8d6ce;--accent:#c84f42;--accent-ink:#fffaf5}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",Arial,sans-serif}
  .shell{width:min(100% - 2rem,1200px);margin:auto}.top{height:54px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.brand{display:flex;gap:10px;align-items:center;font-weight:700}.logo{width:32px;height:32px;border-radius:8px;background:var(--accent);color:white;display:grid;place-items:center}.nav{display:flex;gap:20px;color:var(--muted);font-size:14px}
  .page{padding:16px 0 26px}.actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.action{min-height:58px;border:1px solid var(--line);border-radius:12px;background:var(--surface);display:flex;align-items:center;gap:12px;padding:10px 12px}.action.active{background:var(--accent);color:white;border-color:transparent}.icon{width:36px;height:36px;border-radius:9px;background:var(--strong);display:grid;place-items:center}.active .icon{background:rgba(255,255,255,.16)}.action b{font-size:15px}.action span{display:block;font-size:12px;color:var(--muted);margin-top:2px}.active span{color:rgba(255,255,255,.75)}
  h1{font-size:22px;letter-spacing:-.02em;margin:22px 0 6px}.sub{margin:0 0 16px;color:var(--muted);font-size:14px}.search{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 24px rgba(40,32,25,.04)}.search input{border:0;outline:0;background:transparent;font-size:16px;flex:1}.tabs{display:flex;gap:6px;overflow:hidden;margin:12px 0}.tab{border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:8px 12px;font-size:12px}.tab.active{background:var(--accent);color:white;border-color:transparent}
  .section-title{display:flex;align-items:end;justify-content:space-between;margin:14px 0 9px}.section-title h2{font-size:18px;margin:0}.section-title p{margin:0;color:var(--muted);font-size:12px}.list{display:grid;gap:8px}.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;grid-template-columns:90px minmax(0,1fr);gap:12px}.cover{width:90px;height:130px;border-radius:9px;object-fit:cover}.meta{display:flex;flex-wrap:wrap;gap:6px;color:var(--muted);font-size:11px}.pill{border-radius:6px;background:var(--strong);padding:3px 7px}.title{font-weight:700;font-size:16px;line-height:1.28;margin:6px 0 3px}.desc{font-size:12px;line-height:1.55;color:var(--muted);margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.score{margin-top:8px;display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}.hot{color:#b63129;font-weight:800}
  .rankbox{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}.rank-head{padding:13px 15px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between}.rank-head h2{font-size:18px;margin:0}.rank-row{display:grid;grid-template-columns:44px 90px minmax(0,1fr) 80px 82px;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line)}.rank-row:last-child{border-bottom:0}.num{width:34px;height:34px;border-radius:8px;background:var(--strong);display:grid;place-items:center;font-size:12px;font-weight:800}.num.top{background:var(--accent);color:white}.trend{font-size:12px;color:var(--muted)}.platform-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}.platform-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}.platform-card h3{font-size:16px;margin:0;padding:12px;border-bottom:1px solid var(--line)}.mini{display:grid;grid-template-columns:28px 58px minmax(0,1fr);gap:8px;padding:9px 10px;border-bottom:1px solid var(--line)}.mini img{width:58px;height:82px;border-radius:7px;object-fit:cover}.mini b{font-size:12px;line-height:1.25}.mini p{font-size:11px;color:var(--muted);margin:5px 0 0}.detail{display:grid;grid-template-columns:220px 1fr;gap:24px;margin-top:18px}.detail-cover{width:220px;height:315px;border-radius:12px;object-fit:cover}.detail h1{font-size:30px;margin-top:0}.resources{display:grid;gap:8px;margin-top:18px}.resource{border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:center}.btn{background:var(--accent);color:white;border-radius:8px;padding:10px 12px;font-size:12px;font-weight:700}
  @media(max-width:640px){.shell{width:min(100% - 1rem,1200px)}.nav{display:none}.page{padding-top:12px}.actions{gap:6px}.action{min-height:54px;padding:8px}.icon{width:32px;height:32px}.action b{font-size:13px}.action span{display:none}h1{font-size:20px;margin-top:18px}.card{grid-template-columns:70px minmax(0,1fr);gap:10px;padding:10px}.cover{width:70px;height:100px}.title{font-size:14px}.platform-grid{grid-template-columns:1fr}.rank-row{grid-template-columns:34px 70px minmax(0,1fr);gap:10px;padding:10px}.rank-row .cover{width:70px;height:100px}.rank-row .hot,.rank-row .trend{grid-column:3}.num{width:28px;height:28px}.detail{grid-template-columns:1fr}.detail-cover{width:150px;height:215px;margin:auto}.detail h1{font-size:24px}.resources{margin-top:14px}}
`;

function header() {
  return `<header><div class="shell top"><div class="brand"><div class="logo">⌕</div>短剧寻址</div><nav class="nav"><span>搜索</span><span>排行榜</span><span>提交资源</span><span>授权下载</span><span>收录原则</span></nav></div></header>`;
}

function actions(active = "search") {
  const items = [["search", "搜索海外短剧", "实时查找正片来源", "⌕"], ["rank", "平台短剧排行榜", "按平台发现热门短剧", "▥"], ["download", "授权内容下载", "保存自有媒体文件", "⇩"]];
  return `<div class="actions">${items.map(([id, label, detail, icon]) => `<div class="action ${active === id ? "active" : ""}"><div class="icon">${icon}</div><div><b>${label}</b><span>${detail}</span></div></div>`).join("")}</div>`;
}

function dramaCard(d, i) {
  return `<article class="card"><img class="cover" src="${cover(i, d[0])}" alt=""><div><div class="meta"><span class="pill">${d[1]}</span><span>${d[2]}</span><span>${d[3]}</span></div><div class="title">${d[0]}</div><p class="desc">A fast-paced overseas short drama with verified official sources, clear episode information, and compact discovery metadata for quick browsing.</p><div class="score"><span class="hot">🔥${d[4]}</span><span>信 ${88 + (i % 8)}</span><span>${d[5]}</span></div></div></article>`;
}

function homeHtml(widthLabel) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${header()}<main class="shell page">${actions("search")}<h1>搜索海外短剧</h1><p class="sub">输入剧名、关键词或类型，快速查看真实正片来源。</p><div class="search">⌕<input value="" placeholder="输入剧名、英文名、关键词或类型"></div><div class="tabs"><span class="tab active">全部 (24)</span><span class="tab">ReelShort (8)</span><span class="tab">DramaBox (6)</span><span class="tab">NetShort (4)</span><span class="tab">ShortMax (3)</span></div><div class="section-title"><h2>Trending Now</h2><p>${widthLabel}</p></div><section class="list">${dramas.slice(0, widthLabel.includes("390") ? 6 : 8).map(dramaCard).join("")}</section></main></body></html>`;
}

function rankingsHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${header()}<main class="shell page">${actions("rank")}<h1>海外短剧热门发现</h1><p class="sub">官方平台、真实封面、明确集数和高可信度资源。</p><section class="rankbox"><div class="rank-head"><div><h2>Global Trending TOP100</h2><p class="sub" style="margin:4px 0 0">已过滤低质候选，只保留高可信短剧。</p></div><b>可展示 42</b></div>${dramas.map((d,i)=>`<div class="rank-row"><div class="num ${i<3?"top":""}">#${i+1}</div><img class="cover" src="${cover(i,d[0])}"><div><div class="title">${d[0]}</div><div class="meta"><span class="pill">${d[1]}</span><span>${d[2]}</span><span>${d[3]}</span></div></div><div class="hot">🔥${d[4]}</div><div class="trend">${d[5]}</div></div>`).join("")}</section><section class="platform-grid">${["ReelShort","DramaBox","ShortMax"].map((p,pi)=>`<div class="platform-card"><h3>${p}</h3>${dramas.slice(pi,pi+3).map((d,i)=>`<div class="mini"><div class="num ${i===0?"top":""}">${i+1}</div><img src="${cover(i+pi,d[0])}"><div><b>${d[0]}</b><p>${d[2]} · 🔥${d[4]}</p></div></div>`).join("")}</div>`).join("")}</section></main></body></html>`;
}

function detailHtml() {
  const d = dramas[0];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${header()}<main class="shell page"><div style="font-size:13px;color:var(--muted);margin-bottom:10px">返回搜索</div><section class="detail"><img class="detail-cover" src="${cover(0,d[0])}"><div><div class="meta"><span class="pill">正版来源</span><span>${d[3]}</span><span>EN / ZH</span></div><h1>${d[0]}</h1><p class="sub">亿万富翁丈夫的双面人生</p><p style="font-size:14px;line-height:1.65;color:var(--muted);max-width:680px">一场仓促的婚姻，让两个隐藏身份的人被迫重新认识彼此。页面聚合官方观看入口、平台信息、集数、热度和相关推荐，保持信息型布局。</p><div class="resources"><h2 style="font-size:18px;margin:0 0 4px">官方观看入口</h2>${["ReelShort","YouTube","DramaBox"].map(p=>`<div class="resource"><div><b>${p}</b><div class="meta" style="margin-top:6px"><span>Global / EN</span><span>检查于 2026/7/9</span></div></div><div class="btn">官方观看 ↗</div></div>`).join("")}</div></div></section></main></body></html>`;
}

async function shot(browser, name, html, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  await page.close();
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
await shot(browser, "dramaseek-iphone-390-home.png", homeHtml("iPhone 390px"), { width: 390, height: 844 });
await shot(browser, "dramaseek-macbook-1440-home.png", homeHtml("MacBook 1440px"), { width: 1440, height: 900 });
await shot(browser, "dramaseek-drama-detail.png", detailHtml(), { width: 1200, height: 900 });
await browser.close();
console.log("screenshots written to", outDir);
