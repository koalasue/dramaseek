# 短剧寻址

海外短剧正版资源聚合搜索 MVP。支持中文名、英文名、别名与模糊搜索，将同一剧目的 YouTube、ReelShort、DramaBox、NetShort、Dailymotion 和 TikTok 官方入口合并展示。

## 本地运行

```bash
pnpm install
pnpm dev
```

这是标准 Next.js 网站，不依赖 Codex。部署到 Vercel 后，手机和电脑可直接通过同一个 HTTPS 地址使用。

## 播放时实时中文字幕

- 搜索结果的“前往观看”会进入站内播放页；检测到播放器后，画面右侧自动出现悬浮字幕按钮。
- 电脑端点击按钮后选择正在播放的标签页，并勾选“共享音频”。
- 手机浏览器不支持标签页系统音频时，会请求麦克风权限，可通过扬声器收音生成字幕。
- 字幕来源支持自动模式：优先读取视频字幕轨，其次识别画面底部硬字幕 OCR，最后使用播放音频识别。
- 画面 OCR 可用于站内 `<video>` 和用户授权的屏幕/标签页共享；外部 iframe 受浏览器跨域限制，不能直接截取平台画面。
- 识别和翻译在设备本地完成。首次使用需要下载量化 Whisper 模型；字幕文本和音频不会保存。
- 平台禁止嵌入、DRM 或浏览器拒绝音频捕获时，只能跳转官方页面观看。

未配置环境变量时，网站使用内置演示数据，管理后台在开发环境直接开放。复制 `.env.example` 为 `.env.local` 并填入 Supabase 配置后，应用会自动读取数据库。

## Supabase

1. 新建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/schema.sql`。
3. 配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`。
4. 配置 `ADMIN_PASSWORD` 与 `CRON_SECRET`，生产环境不可留空。

## Firecrawl 实时发现

配置 `FIRECRAWL_API_KEY` 后，搜索结果不足时会从 ReelShort、DramaBox 和 NetShort 的官方域名发现公开剧目页面。结果必须同时通过官方域名、原剧名匹配和正片特征过滤；解说、影评、预告与无关页面不会进入结果。可通过 `FIRECRAWL_API_URL` 切换到自托管实例。

Firecrawl 只用于公开元数据和官方观看入口，不抓取视频文件，也不绕过登录、付费、地区限制或 DRM。

## YouTube 与搜索兜底

- 配置 `YOUTUBE_API_KEY` 后，搜索页和排行榜会调用 YouTube Data API 获取视频标题、缩略图、频道与播放数据，并继续过滤解说、预告、影评和二创内容。
- 配置 `SERPAPI_KEY` 后，系统会用 Google 搜索兜底发现 ReelShort、DramaBox、NetShort 的官方剧目页，再读取页面 OpenGraph/JSON-LD 元数据作为真实封面和简介候选。
- TikTok 暂不作为官方播放 API 接入；只能通过搜索线索辅助发现讨论热度，最终仍需人工审核。

后台 `/admin` 增加了“平台诊断”和“导入采集结果”。Agent-Reach 等本地采集工具整理出的 JSON 可以粘贴导入，导入后进入待审核队列，不会直接公开。

## 数据和合规边界

- 公开结果只展示已发布剧目中标记为官方且未失效的资源。
- 用户提交必须来自六个平台的 HTTPS 页面，视频文件和流媒体直链会被拒绝。
- 采集适配器默认不抓取页面，只有在接入官方 API、RSS、站点地图或平台明确允许的公开元数据后才能启用。
- 本站不抓取第三方平台视频，也不绕过付费或 DRM；仅代理用户已授权域名上的直接媒体文件。
- 授权下载页只代理 `AUTHORIZED_DOWNLOAD_HOSTS` 白名单内的直接视频文件，并始终禁止六个短剧平台的抓取下载。

## 授权下载

在 `.env.local` 中配置你拥有内容权限的媒体域名：

```bash
AUTHORIZED_DOWNLOAD_HOSTS=media.your-domain.com,cdn.your-domain.com
MAX_DOWNLOAD_BYTES=524288000
```

下载入口位于 `/downloads`。只接受 HTTPS 的 MP4、WebM、MOV 和 M4V 直链；网页、M3U8、DRM、内网地址及短剧平台域名会被拒绝。

## 接口

- `GET /api/search?q=&platform=&language=`
- `GET /api/dramas/:slug`
- `GET /api/platforms`
- `POST /api/submissions`
- `PATCH /api/admin/submissions/:id`
- `PATCH /api/admin/resources/:id`
- `POST /api/admin/dramas/merge`
- `GET /api/admin/diagnostics`
- `POST /api/admin/import`
- `GET /api/cron/sync`
- `GET /api/cron/health`

## 验证

```bash
pnpm test
pnpm lint
pnpm build
```
