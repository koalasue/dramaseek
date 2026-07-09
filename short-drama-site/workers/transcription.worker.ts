type Recognizer = (audio: Float32Array, options: object) => Promise<{ text?: string } | { text?: string }[]>;
let recognizer: Recognizer | null = null;
let activeModel = "";

async function load(model: "fast" | "accurate") {
  const modelId = model === "accurate" ? "Xenova/whisper-base" : "Xenova/whisper-tiny";
  if (!recognizer || activeModel !== modelId) {
    self.postMessage({ type: "status", status: "loading_model" });
    const moduleUrl = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";
    const transformers = await import(/* webpackIgnore: true */ moduleUrl) as { pipeline: (task: string, id: string, options: object) => Promise<Recognizer> };
    recognizer = await transformers.pipeline("automatic-speech-recognition", modelId, { quantized: true });
    activeModel = modelId;
  }
  return recognizer;
}

self.onmessage = async (event: MessageEvent<{ type: "transcribe"; audio: Float32Array; model: "fast" | "accurate"; startedAt: number }>) => {
  if (event.data.type !== "transcribe") return;
  try {
    const pipe = await load(event.data.model);
    const result = await pipe(event.data.audio, { language: null, task: "transcribe" });
    const text = (Array.isArray(result) ? result[0]?.text : result.text)?.trim() ?? "";
    self.postMessage({ type: "result", text, startedAt: event.data.startedAt, endedAt: Date.now() });
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? error.message : "本地语音模型加载失败" });
  }
};
