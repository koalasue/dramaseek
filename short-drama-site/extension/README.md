# Chrome / Edge 扩展

```bash
pnpm build:extension
```

在 `chrome://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，目录选 `extension/dist`。进入支持平台的视频页后会自动出现“字幕”悬浮按钮。

## 为什么扩展能解决 iframe 同源限制

普通网站不能读取第三方 iframe 里的视频、字幕轨或音频，这是浏览器安全边界，不能也不应该绕过。扩展方案不读取 iframe DOM，而是在用户点击字幕按钮后使用 `chrome.tabCapture` 捕获当前标签页音频，再在扩展的 offscreen document 中做 VAD 分句和转写。因此它可以覆盖 ReelShort、DramaBox、YouTube、TikTok 等外部页面。

## ASR endpoint

扩展会优先读取页面 `<video>` 的原生 `textTracks`。如果没有可读字幕轨，就会捕获标签页音频并把每句对白编码成 16 kHz mono WAV，POST 到设置面板里的 ASR endpoint。

请求：

```http
POST /transcribe
Content-Type: multipart/form-data

audio=<utterance.wav>
sampleRate=16000
```

响应：

```json
{ "text": "recognized source subtitle text" }
```

这个 endpoint 可以接本地 Whisper、AWS Nova Sonic/Transcribe、OpenAI/其他云 ASR，或你自己的实时转写服务。扩展收到文本后会调用 Chrome 本地 Translator API 翻译为中文并覆盖到视频上。
