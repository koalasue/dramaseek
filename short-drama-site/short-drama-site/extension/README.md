# Chrome / Edge 扩展

```bash
pnpm build:extension
```

在 `chrome://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，目录选 `extension/dist`。进入支持平台的视频页后会自动出现“字幕”悬浮按钮。首次启动会下载量化 Whisper 模型；音频和字幕只在本机处理，不保存。
