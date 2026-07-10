const SAMPLE_RATE = 16_000;
type Recognizer = (audio: Float32Array, options: object) => Promise<{ text?: string } | { text?: string }[]>;
let stream: MediaStream | null = null, audio: AudioContext | null = null, node: ScriptProcessorNode | null = null;
const recognizer: Recognizer | null = null;
let tabId: number | null = null, busy = false;
const samples: number[] = [];

async function stop() {
  node?.disconnect(); node = null; await audio?.close(); audio = null;
  stream?.getTracks().forEach((track) => track.stop()); stream = null; samples.length = 0; busy = false;
}

async function transcribe(chunk: Float32Array, startedAt: number) {
  if (!recognizer) {
    if (tabId) await chrome.tabs.sendMessage(tabId, { type: "MODEL_STATUS", status: "loading_model" });
    throw new Error("扩展构建前需要安装 @xenova/transformers；独立网站不受影响");
  }
  const result = await recognizer(chunk, { language: null, task: "transcribe" });
  const text = (Array.isArray(result) ? result[0]?.text : result.text)?.trim();
  if (text && tabId) await chrome.tabs.sendMessage(tabId, { type: "TRANSCRIPT", text, startedAt });
}

chrome.runtime.onMessage.addListener((message: { type: string; streamId?: string; tabId?: number }) => {
  if (message.type === "OFFSCREEN_STOP") void stop();
  if (message.type !== "OFFSCREEN_START" || !message.streamId || !message.tabId) return;
  void (async () => {
    try {
      await stop(); tabId = message.tabId;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: message.streamId } } as MediaTrackConstraints, video: false });
      audio = new AudioContext(); const source = audio.createMediaStreamSource(stream), ratio = audio.sampleRate / SAMPLE_RATE;
      node = audio.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0); for (let i = 0; i < input.length; i += ratio) samples.push(input[Math.floor(i)] ?? 0);
        if (samples.length >= SAMPLE_RATE * 1.6 && !busy) {
          busy = true; const chunk = Float32Array.from(samples.splice(0, SAMPLE_RATE * 1.6));
          void transcribe(chunk, Date.now()).catch(async (error) => { if (tabId) await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_ERROR", error: error instanceof Error ? error.message : "识别失败" }); }).finally(() => { busy = false; });
        }
      };
      source.connect(node); node.connect(audio.destination);
      await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_STARTED" });
    } catch (error) { if (tabId) await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_ERROR", error: error instanceof Error ? error.message : "无法读取标签页音频" }); }
  })();
});
