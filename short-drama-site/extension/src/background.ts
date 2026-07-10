import type { ExtensionMessage } from "./messages";

async function ensureOffscreen() {
  const url = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [url] });
  if (!contexts.length) await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: [chrome.offscreen.Reason.USER_MEDIA], justification: "在用户主动开启后处理当前标签页音频并生成本地字幕" });
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, respond) => {
  if (message.type === "START_CAPTURE" && sender.tab?.id) {
    void (async () => {
      try {
        await ensureOffscreen();
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: sender.tab!.id });
        await chrome.runtime.sendMessage({ type: "OFFSCREEN_START", streamId, tabId: sender.tab!.id });
        respond({ ok: true });
      } catch (error) { respond({ ok: false, error: error instanceof Error ? error.message : "无法捕获标签页音频" }); }
    })();
    return true;
  }
  if (message.type === "STOP_CAPTURE") void chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP" });
});
