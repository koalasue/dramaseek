import type { ExtensionMessage } from "./messages";

const SAMPLE_RATE = 16_000;
const MIN_AUDIO_RMS = 0.01;
const ASR_MIN_UTTERANCE_SECONDS = 1.1;
const ASR_MAX_UTTERANCE_SECONDS = 8.5;
const ASR_SILENCE_SECONDS = 0.72;
const ASR_PREROLL_SECONDS = 0.35;

type AsrResponse = { text?: string; transcript?: string; error?: string };

let stream: MediaStream | null = null;
let audio: AudioContext | null = null;
let node: ScriptProcessorNode | null = null;
let tabId: number | null = null;
let busy = false;
let pending: { audio: Float32Array; startedAt: number } | null = null;
let samples: number[] = [];
let preSpeechSamples: number[] = [];
let silenceSamples = 0;
let speechStartedAt = 0;

function audioRms(values: Float32Array) {
  let sum = 0;
  for (const value of values) sum += value * value;
  return Math.sqrt(sum / Math.max(1, values.length));
}

function encodeWav(values: Float32Array) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + values.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + values.length * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, values.length * bytesPerSample, true);
  let offset = 44;
  for (const value of values) {
    const clamped = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function getAsrEndpoint() {
  const value = await chrome.storage.local.get("asrEndpoint");
  return typeof value.asrEndpoint === "string" ? value.asrEndpoint.trim() : "";
}

async function transcribe(chunk: Float32Array, startedAt: number) {
  if (!tabId) return;
  const endpoint = await getAsrEndpoint();
  if (!endpoint) {
    await chrome.tabs.sendMessage(tabId, {
      type: "CAPTURE_ERROR",
      error: "已捕获标签页音频，但还没有配置 ASR endpoint。请在字幕设置里填入本地 Whisper / AWS Nova Sonic / 你的转写服务地址。",
    } satisfies ExtensionMessage);
    return;
  }
  const form = new FormData();
  form.set("audio", encodeWav(chunk), "utterance.wav");
  form.set("sampleRate", String(SAMPLE_RATE));
  const response = await fetch(endpoint, { method: "POST", body: form });
  const payload = await response.json() as AsrResponse;
  if (!response.ok || payload.error) throw new Error(payload.error ?? `ASR 请求失败：${response.status}`);
  const text = (payload.text ?? payload.transcript ?? "").trim();
  if (text) await chrome.tabs.sendMessage(tabId, { type: "TRANSCRIPT", text, startedAt } satisfies ExtensionMessage);
}

function flushPending() {
  const next = pending;
  if (!next) {
    busy = false;
    return;
  }
  pending = null;
  void transcribe(next.audio, next.startedAt)
    .catch(async (error) => {
      if (tabId) await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_ERROR", error: error instanceof Error ? error.message : "识别失败" } satisfies ExtensionMessage);
    })
    .finally(flushPending);
}

function enqueue(chunk: Float32Array, startedAt: number) {
  if (busy) {
    pending = { audio: chunk, startedAt };
    return;
  }
  busy = true;
  void transcribe(chunk, startedAt)
    .catch(async (error) => {
      if (tabId) await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_ERROR", error: error instanceof Error ? error.message : "识别失败" } satisfies ExtensionMessage);
    })
    .finally(flushPending);
}

async function stop() {
  node?.disconnect();
  node = null;
  await audio?.close();
  audio = null;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  samples = [];
  preSpeechSamples = [];
  silenceSamples = 0;
  speechStartedAt = 0;
  pending = null;
  busy = false;
}

function processAudioFrame(frame: number[]) {
  const hasSpeech = audioRms(Float32Array.from(frame)) >= MIN_AUDIO_RMS;
  const maxPreSpeechSamples = Math.round(SAMPLE_RATE * ASR_PREROLL_SECONDS);
  if (hasSpeech && samples.length === 0) {
    speechStartedAt = Date.now() - Math.round(preSpeechSamples.length / SAMPLE_RATE * 1000);
    samples.push(...preSpeechSamples);
    preSpeechSamples = [];
  }
  if (hasSpeech || samples.length > 0) {
    samples.push(...frame);
    silenceSamples = hasSpeech ? 0 : silenceSamples + frame.length;
  } else {
    preSpeechSamples.push(...frame);
    if (preSpeechSamples.length > maxPreSpeechSamples) preSpeechSamples.splice(0, preSpeechSamples.length - maxPreSpeechSamples);
    return;
  }
  const minSamples = Math.round(SAMPLE_RATE * ASR_MIN_UTTERANCE_SECONDS);
  const maxSamples = Math.round(SAMPLE_RATE * ASR_MAX_UTTERANCE_SECONDS);
  const silenceLimit = Math.round(SAMPLE_RATE * ASR_SILENCE_SECONDS);
  const hasEnoughSpeech = samples.length - silenceSamples >= minSamples;
  const shouldFinalize = samples.length >= maxSamples || (hasEnoughSpeech && silenceSamples >= silenceLimit);
  if (!shouldFinalize) return;
  const trim = silenceSamples >= silenceLimit ? Math.min(silenceSamples, Math.round(SAMPLE_RATE * 0.42)) : 0;
  const kept = samples.slice(0, Math.max(minSamples, samples.length - trim));
  samples = [];
  silenceSamples = 0;
  const chunk = Float32Array.from(kept);
  if (audioRms(chunk) >= MIN_AUDIO_RMS) enqueue(chunk, speechStartedAt || Date.now());
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === "OFFSCREEN_STOP") void stop();
  if (message.type !== "OFFSCREEN_START") return;
  void (async () => {
    try {
      await stop();
      tabId = message.tabId;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: message.streamId } } as MediaTrackConstraints,
        video: false,
      });
      audio = new AudioContext();
      const source = audio.createMediaStreamSource(stream);
      const ratio = audio.sampleRate / SAMPLE_RATE;
      const silentOutput = audio.createGain();
      silentOutput.gain.value = 0;
      node = audio.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const frame: number[] = [];
        for (let index = 0; index < input.length; index += ratio) frame.push(input[Math.floor(index)] ?? 0);
        processAudioFrame(frame);
      };
      source.connect(node);
      node.connect(silentOutput);
      silentOutput.connect(audio.destination);
      await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_STARTED" } satisfies ExtensionMessage);
    } catch (error) {
      if (tabId) await chrome.tabs.sendMessage(tabId, { type: "CAPTURE_ERROR", error: error instanceof Error ? error.message : "无法读取标签页音频" } satisfies ExtensionMessage);
    }
  })();
});
