import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require("/Users/suziya/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
}

const { chromium, devices } = playwright;
const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3001";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(process.cwd(), "outputs", "qa", runId);
mkdirSync(outputDir, { recursive: true });

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const viewports = [
  { name: "pc", use: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false } },
  { name: "iphone", use: devices["iPhone 13"] },
  { name: "android", use: devices["Pixel 5"] },
];

const pages = [
  { name: "home", path: "/" },
  { name: "search", path: "/search?q=Love" },
  { name: "rankings", path: "/rankings" },
  { name: "watch", path: "/watch?url=https%3A%2F%2Fwww.dailymotion.com%2Fvideo%2Fxaiwylm&title=Fated%20to%20My%20Forbidden%20Alpha" },
];

const errors = [];
const screenshots = [];

function fail(message) {
  errors.push(message);
}

async function checkApi() {
  const checks = [
    { name: "rankings", path: "/api/rankings" },
    { name: "live-search", path: "/api/live-search?q=Love" },
    { name: "platforms", path: "/api/platforms" },
    { name: "bad-cloud", path: "/api/cloud-resources", init: { method: "POST", body: "{}", headers: { "content-type": "application/json" } }, expectedStatus: 400 },
  ];

  for (const check of checks) {
    const response = await fetch(`${baseUrl}${check.path}`, check.init);
    const expected = check.expectedStatus ?? 200;
    if (response.status !== expected) fail(`API ${check.name}: expected ${expected}, got ${response.status}`);
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-json failures are reported below */ }
    if (!json) {
      fail(`API ${check.name}: response is not JSON`);
      continue;
    }
    if (check.name === "rankings" && (!Array.isArray(json.panels) || !json.sourceDiagnostics)) fail("API rankings: missing panels/sourceDiagnostics");
    if (check.name === "live-search" && (!Array.isArray(json.resources) || !json.platformStatus)) fail("API live-search: missing resources/platformStatus");
    if (check.name === "platforms" && !Array.isArray(json.platforms)) fail("API platforms: missing platforms[]");
    if (/YOUTUBE_API_KEY|SERPAPI_KEY|FIRECRAWL_API_KEY|sk-[A-Za-z0-9_-]+/i.test(text)) fail(`API ${check.name}: possible secret leakage`);
  }
}

function walkFiles(root, out = []) {
  for (const entry of readdirSync(root)) {
    if (["node_modules", ".next", ".git", "outputs"].includes(entry)) continue;
    const full = path.join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|json|md)$/.test(entry)) out.push(full);
  }
  return out;
}

function checkSecurity() {
  const unsafeHtmlApi = ["dangerously", "SetInnerHTML"].join("");
  for (const file of walkFiles(process.cwd())) {
    const content = readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file);
    if (/NEXT_PUBLIC_(?:YOUTUBE|SERP|FIRECRAWL).*KEY/i.test(content)) fail(`Security ${rel}: public API key-like env name`);
    if (content.includes(unsafeHtmlApi)) fail(`Security ${rel}: ${unsafeHtmlApi} requires review`);
    if (/process\.env\.(YOUTUBE_API_KEY|SERPAPI_KEY|FIRECRAWL_API_KEY)/.test(content) && /components\/|app\/.*page\.tsx/.test(rel)) {
      fail(`Security ${rel}: server secret referenced from render/client surface`);
    }
  }
}

async function checkBrowser() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(chromePath) ? chromePath : undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  for (const viewport of viewports) {
    const context = await browser.newContext(viewport.use);
    const page = await context.newPage();
    const runtimeErrors = [];
    let dialogOpened = false;
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    page.on("dialog", async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });

    for (const target of pages) {
      runtimeErrors.length = 0;
      const response = await page.goto(`${baseUrl}${target.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!response || response.status() >= 400) fail(`${viewport.name}/${target.name}: HTTP ${response?.status() ?? "none"}`);
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      const bodyText = await page.locator("body").innerText({ timeout: 15000 }).catch(() => "");
      if (!bodyText.trim()) fail(`${viewport.name}/${target.name}: blank body`);
      if (/Runtime Error|Invalid src prop|Unhandled Runtime Error/i.test(bodyText)) fail(`${viewport.name}/${target.name}: Next runtime error visible`);
      if (runtimeErrors.some((value) => /Invalid src prop|Runtime Error|Hydration failed/i.test(value))) {
        fail(`${viewport.name}/${target.name}: ${runtimeErrors.join(" | ").slice(0, 500)}`);
      }
      const screenshotPath = path.join(outputDir, `${viewport.name}-${target.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);
    }

    await page.goto(`${baseUrl}/search?q=${encodeURIComponent("<script>alert(1)</script>")}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1000);
    if (dialogOpened) fail(`${viewport.name}/xss: script payload opened a dialog`);
    await context.close();
  }

  await browser.close();
}

await checkApi();
checkSecurity();
await checkBrowser();

const report = { baseUrl, outputDir, screenshots, errors };
writeFileSync(path.join(outputDir, "qa-report.json"), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
