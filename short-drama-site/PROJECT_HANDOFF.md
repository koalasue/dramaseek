# DramaSeek Project Handoff

Date: 2026-07-13

## Project

DramaSeek is a personal overseas short drama search, viewing, and backup management tool.

Core positioning:

- Overseas short drama search engine
- Short drama resource aggregator
- Online viewing entry manager
- Personal cloud backup link manager
- Local development yt-dlp resource parser

Not intended for:

- Public sharing
- User community
- Comments or ratings
- Public download platform
- Bypassing login, payment, region, DRM, or platform restrictions

## Current Status

Implemented:

- Home, Search, Rankings, Drama detail, Watch, My Library, Submit pages
- Drama entity normalization and basic title cleanup
- Resource search flow for YouTube, Dailymotion, and public discovery sources
- Playback page with online player, external platform mode, subtitle status, cloud backup entry
- Cloud resource recording for Baidu Cloud and Quark Cloud
- My Library showing saved/favorite/cloud backup style data
- yt-dlp based Download Service backend module
- Download Task API
- Download Resource UI on watch page, drama detail page, and `/downloads`
- yt-dlp startup check through `instrumentation.ts`
- yt-dlp health API at `/api/downloads/health`
- Development rules in `AGENTS.md`
- Unit tests for search, rankings, download policy, yt-dlp path handling, cloud resource policy, and source capability
- Playwright screenshot output in `outputs/`

## yt-dlp Integration

The project reads:

```bash
YTDLP_BIN
```

If not set, it falls back to:

```bash
yt-dlp
```

Current behavior:

- Development on macOS should run yt-dlp locally.
- Production keeps `YTDLP_BIN` as an environment variable hook.
- Vercel should not be assumed to run large download jobs directly.
- If yt-dlp is unavailable, APIs return:

```text
yt-dlp not installed, please install it with brew install yt-dlp
```

Install on macOS:

```bash
brew install yt-dlp
which yt-dlp
yt-dlp --version
yt-dlp -F "https://www.dailymotion.com/video/xaiwylm"
```

Optional local environment:

```bash
export YTDLP_BIN="$(which yt-dlp)"
```

## Important Commands

Install dependencies:

```bash
pnpm install
```

Run local development:

```bash
pnpm dev
```

Run tests:

```bash
pnpm test
```

Type check:

```bash
pnpm exec tsc --noEmit
```

Build:

```bash
pnpm build
```

Check yt-dlp health:

```bash
curl http://127.0.0.1:3001/api/downloads/health
```

## Environment Variables

See `.env.example`.

Common keys:

- `YTDLP_BIN`
- `FIRECRAWL_API_KEY`
- `FIRECRAWL_API_URL`
- `YOUTUBE_API_KEY`
- `SERPAPI_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `CRON_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_TRANSLATE_MODEL`

## Known Missing / Needs Attention

- Homebrew / yt-dlp was not fully installed on this Mac at handoff time.
- Real yt-dlp parsing needs to be tested after installing yt-dlp.
- Some non-Dailymotion platform data may still depend on external APIs and public page availability.
- Rankings data quality still needs more real-source verification.
- Lighthouse was not run because the project does not currently include Lighthouse tooling locally.
- Build has an existing warning in `app/rankings/drama/page.tsx` for using `<img>` instead of Next `<Image />`.
- Cloud transfer is currently a link-recording/manual workflow, not automatic Baidu/Quark transfer.
- AI real-time subtitles are not core-dependent; subtitle fallback is cloud/player-based.

## Last Verified

Before handoff, the project had passing checks:

- Vitest unit tests: 59 tests passed
- TypeScript check passed
- Next production build passed
- Playwright browser test passed on PC, iPhone, and Android sizes
- yt-dlp missing state correctly returned 503 from `/api/downloads/health` and `/api/downloads/tasks`

Screenshots are stored under:

```text
outputs/
```

## Suggested Next Steps

1. Install Homebrew and yt-dlp on the new Mac.
2. Run `yt-dlp --version`.
3. Run `yt-dlp -F` against a Dailymotion public URL.
4. Start DramaSeek with `pnpm dev`.
5. Open `/downloads` and test Download Resource.
6. If moving to production, decide whether yt-dlp parsing runs on a separate worker/service instead of Vercel.
