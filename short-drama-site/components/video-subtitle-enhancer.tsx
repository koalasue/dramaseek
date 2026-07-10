"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GearSix, Pause, Subtitles, X } from "@phosphor-icons/react";
import { defaultSubtitleSettings, readSubtitleSettings, SUBTITLE_SETTINGS_KEY } from "@/lib/subtitles/settings";
import type { SubtitleCue, SubtitleSettings, TranslationSession } from "@/lib/subtitles/types";

const SAMPLE_RATE = 16_000;
const OCR_INTERVAL_MS = 2600;
const ASR_CHUNK_SECONDS = 3.2;
const MIN_AUDIO_RMS = 0.012;
const MIN_ASR_CONFIDENCE = 0.68;
const garbageSubtitlePattern = /\b(thanks?\s+for\s+watching|subscribe|follow|like\s+(?:and\s+)?share|official\s+channel|trailer|episode\s+preview|preview|watermark|click\s+to\s+subscribe|turn\s+on\s+notifications?)\b|感谢观看|订阅|点赞|关注|转发|预告|片花|水印/i;
const nonDialoguePattern = /^\s*[\[(（【]?\s*(?:cl|sound|sfx|music|door|knock|laugh|laughs|laughing|cry|crying|noise|sigh|sighs|applause|silence|breath|breathing|phone ringing|ringing|footsteps?|thunder|door opening|door closing|dramatic music|background music|音乐|笑声|哭声|噪音|开门|关门|脚步声|叹气)\b[^)\]）】]*[\])）】]?\s*$/i;

type TesseractModule = {
  recognize: (image: CanvasImageSource, language?: string, options?: object) => Promise<{ data?: { text?: string; confidence?: number } }>;
};

function largestVideo() {
  return [...document.querySelectorAll("video, iframe[data-video-frame]")].filter((item) => {
    const box = item.getBoundingClientRect(); return box.width >= 240 && box.height >= 140;
  }).sort((a, b) => {
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    return br.width * br.height - ar.width * ar.height;
  })[0] ?? null;
}

function rgba(hex: string, opacity: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}

function cleanSubtitleText(text: string) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isLowQualitySubtitle(text: string) {
  const cleaned = cleanSubtitleText(text);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 220) return true;
  if (garbageSubtitlePattern.test(cleaned)) return true;
  if (nonDialoguePattern.test(cleaned)) return true;
  if (/^[\[(（【].{0,60}[\])）】]$/.test(cleaned) && !/[?!'"“”‘’]/.test(cleaned)) return true;
  const letters = cleaned.replace(/[^a-zA-Z\u4e00-\u9fff]/g, "");
  if (letters.length < 2) return true;
  const repeated = cleaned.match(/\b(\w{2,})\b(?:\s+\1\b){2,}/i);
  return Boolean(repeated);
}

function audioRms(samples: Float32Array) {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

async function translate(text: string) {
  try {
    const response = await fetch("/api/subtitles/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceLanguage: "auto", targetLanguage: "zho_Hans", segments: [{ text }], mode: "contextual_short_drama" }),
    });
    if (response.ok) {
      const payload = await response.json() as { segments?: Array<{ translatedText?: string; translated_text?: string; text?: string; language?: string }> };
      const translated = payload.segments?.[0]?.translatedText ?? payload.segments?.[0]?.translated_text;
      if (translated) return { text: translated, language: payload.segments?.[0]?.language ?? "auto", translated: true };
    }
  } catch {
    // Fallback to browser translator below.
  }
  if (typeof LanguageDetector === "undefined" || typeof Translator === "undefined") return { text, language: "und", translated: false };
  const detector = await LanguageDetector.create();
  const [result] = await detector.detect(text);
  const language = result?.detectedLanguage ?? "en";
  if (language.startsWith("zh")) return { text, language, translated: true };
  const translator = await Translator.create({ sourceLanguage: language, targetLanguage: "zh-Hans" });
  return { text: await translator.translate(text), language, translated: true };
}

type CaptureCapableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function shouldUseMicrophoneFirst() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || !navigator.mediaDevices.getDisplayMedia;
}

function sourceLabel(source?: SubtitleCue["source"]) {
  if (source === "asr") return "ASR";
  if (source === "captions") return "Original Subtitle";
  if (source === "ocr") return "OCR";
  return "Audio";
}

function captureVideoElementAudio(video: HTMLVideoElement) {
  const source = video as CaptureCapableVideo;
  const media = source.captureStream?.() ?? source.mozCaptureStream?.();
  if (!media?.getAudioTracks().length) return null;
  return media;
}

async function captureAudio(target: Element | null, stopTracks: () => void) {
  if (target instanceof HTMLVideoElement) {
    const media = captureVideoElementAudio(target);
    if (media) return media;
    if (target.paused) throw new Error("请先播放视频，再开启实时字幕。");
  }
  if (shouldUseMicrophoneFirst()) return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
  const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  if (display.getAudioTracks().length) return display;
  display.getTracks().forEach((track) => track.stop());
  stopTracks();
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
}

async function readOcrText(source: HTMLVideoElement) {
  if (!source.videoWidth || !source.videoHeight) return "";
  const cropY = Math.floor(source.videoHeight * 0.58);
  const cropHeight = Math.floor(source.videoHeight * 0.34);
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(960, source.videoWidth);
  canvas.height = Math.round(canvas.width * cropHeight / source.videoWidth);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";
  context.filter = "contrast(1.35) saturate(0.85)";
  context.drawImage(source, 0, cropY, source.videoWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  const moduleUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm";
  const tesseract = await import(/* webpackIgnore: true */ moduleUrl) as TesseractModule;
  const result = await tesseract.recognize(canvas, "eng+spa+fra+kor+jpn");
  return (result.data?.text ?? "").replace(/\s+/g, " ").trim();
}

function subtitleStatusLabel(status: TranslationSession["status"]) {
  if (status === "detecting_subtitles") return "正在检测烧录字幕…";
  if (status === "reading_ocr") return "字幕处理中…";
  if (status === "ocr_detected") return "英文识别完成…";
  if (status === "translating") return "正在生成中文…";
  if (status === "translated") return "中文生成完成…";
  if (status === "ready") return "字幕加载完成";
  if (status === "loading_model") return "正在加载语音识别模型…";
  if (status === "listening") return "正在监听音频…";
  return "正在准备字幕…";
}

async function createOcrSource(target: Element) {
  if (target instanceof HTMLVideoElement) return { video: target, cleanup: () => {} };
  if (!navigator.mediaDevices.getDisplayMedia) throw new Error("当前浏览器无法截取外部平台画面，请改用音频识别");
  const capture = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = capture;
  await video.play();
  return {
    video,
    cleanup: () => {
      capture.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

export function VideoSubtitleEnhancer() {
  const [target, setTarget] = useState<Element | null>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [settings, setSettings] = useState<SubtitleSettings>(defaultSubtitleSettings);
  const [open, setOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [cue, setCue] = useState<SubtitleCue | null>(null);
  const [session, setSession] = useState<TranslationSession>({ status: "idle", model: "auto" });
  const worker = useRef<Worker | null>(null), stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null), processor = useRef<ScriptProcessorNode | null>(null);
  const samples = useRef<number[]>([]), busy = useRef(false), dragged = useRef(false);
  const lastAcceptedCue = useRef<{ text: string; at: number } | null>(null);
  const captionCleanup = useRef<(() => void) | null>(null);
  const ocrCleanup = useRef<(() => void) | null>(null);

  useEffect(() => setSettings(readSubtitleSettings(localStorage)), []);
  useEffect(() => { localStorage.setItem(SUBTITLE_SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    const update = () => { const found = largestVideo(); setTarget(found); setBox(found?.getBoundingClientRect() ?? null); setPortalHost(document.fullscreenElement ?? document.body); };
    update(); const observer = new MutationObserver(update); observer.observe(document.documentElement, { subtree: true, childList: true });
    const timer = window.setInterval(update, 1000); window.addEventListener("resize", update); document.addEventListener("fullscreenchange", update);
    return () => { observer.disconnect(); clearInterval(timer); window.removeEventListener("resize", update); document.removeEventListener("fullscreenchange", update); };
  }, []);

  const stop = useCallback(() => {
    captionCleanup.current?.(); captionCleanup.current = null;
    ocrCleanup.current?.(); ocrCleanup.current = null;
    processor.current?.disconnect(); processor.current = null; void context.current?.close(); context.current = null;
    stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
    worker.current?.terminate(); worker.current = null; samples.current = []; busy.current = false; setCue(null);
    setSession({ status: "idle", model: settings.model });
  }, [settings.model]);
  useEffect(() => stop, [stop]);

  const publishCue = useCallback(async (rawText: string, source: SubtitleCue["source"], startedAt: number, confidence: number) => {
    const originalText = cleanSubtitleText(rawText);
    if (source === "ocr") {
      setSession((current) => ({ ...current, status: "ocr_detected", error: "英文识别完成，正在翻译中文。" }));
    }
    if (source === "asr" && confidence < MIN_ASR_CONFIDENCE) {
      setSession((current) => ({ ...current, status: "listening", error: "已过滤低置信度 ASR 结果。" }));
      return;
    }
    if (isLowQualitySubtitle(originalText)) {
      setSession((current) => ({ ...current, status: "listening", error: "已过滤非对白、音效或片尾/水印文字。" }));
      return;
    }
    const normalized = originalText.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    const recent = lastAcceptedCue.current;
    if (recent && recent.text === normalized && Date.now() - recent.at < 8500) {
      setSession((current) => ({ ...current, status: "listening", error: "已过滤重复字幕。" }));
      return;
    }
    setSession((current) => ({ ...current, status: "translating", error: source === "ocr" ? "英文识别完成，中文生成中。" : undefined }));
    const output = await translate(originalText);
    const translatedText = cleanSubtitleText(output.text);
    if (isLowQualitySubtitle(translatedText) && source !== "captions") {
      setSession((current) => ({ ...current, status: "listening", error: "已过滤疑似广告、片尾或水印字幕。" }));
      return;
    }
    const next: SubtitleCue = {
      id: crypto.randomUUID(),
      startedAt,
      endedAt: Date.now(),
      detectedLanguage: output.language,
      originalText,
      translatedText,
      confidence,
      source,
    };
    lastAcceptedCue.current = { text: normalized, at: Date.now() };
    setCue(next);
    window.dispatchEvent(new CustomEvent("dramaseek:subtitle-cue", { detail: next }));
    setSession((current) => ({
      ...current,
      status: "translated",
      detectedLanguage: output.language,
      currentCue: next,
      latencyMs: Date.now() - startedAt,
      error: output.translated ? "中文生成完成，字幕加载中。" : "当前浏览器不支持本地翻译，已先显示识别到的原文。",
    }));
    window.setTimeout(() => setSession((current) => ({ ...current, status: "ready", error: output.translated ? undefined : current.error })), 250);
  }, []);

  const startOcrSession = useCallback(async (notice?: string) => {
    const source = await createOcrSource(target!);
    let lastText = "";
    let disposed = false;
    const run = async () => {
      if (disposed || busy.current) return;
      try {
        busy.current = true;
        setSession((current) => ({ ...current, status: "reading_ocr", error: notice ?? (source.video === target ? "字幕处理中：正在识别画面底部英文烧录字幕。" : "请在共享窗口里保持视频可见，系统会识别画面底部字幕。") }));
        const rawText = await readOcrText(source.video);
        if (rawText && rawText !== lastText) {
          lastText = rawText;
          await publishCue(rawText, "ocr", Date.now(), 0.82);
        } else {
          setSession((current) => ({ ...current, status: "reading_ocr" }));
        }
      } finally {
        busy.current = false;
      }
    };
    const timer = window.setInterval(() => void run().catch((error) => setSession((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "画面字幕 OCR 失败" }))), OCR_INTERVAL_MS);
    ocrCleanup.current = () => { disposed = true; window.clearInterval(timer); source.cleanup(); };
    setSession({ status: "detecting_subtitles", model: settings.model, error: notice ?? "正在检测视频是否存在英文烧录字幕。" });
    void run();
  }, [publishCue, settings.model, target]);

  const start = async () => {
    try {
      setSession({ status: "requesting", model: settings.model });
      const sourceMode = settings.sourceMode === "auto" ? (target instanceof HTMLVideoElement && target.textTracks.length ? "captions" : "ocr") : settings.sourceMode;
      if (sourceMode === "captions" && target instanceof HTMLVideoElement && target.textTracks.length) {
        const track = [...target.textTracks].find((item) => item.kind === "subtitles" || item.kind === "captions") ?? target.textTracks[0];
        track.mode = "hidden";
        const onCue = () => {
          const activeCue = track.activeCues?.[0] as VTTCue | undefined;
          if (!activeCue?.text) return;
          const startedAt = Date.now();
          void publishCue(activeCue.text, "captions", startedAt, 1)
            .catch((error) => setSession((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "字幕翻译失败" })));
        };
        track.addEventListener("cuechange", onCue); captionCleanup.current = () => track.removeEventListener("cuechange", onCue);
        setSession({ status: "listening", model: settings.model }); onCue(); return;
      }
      if (sourceMode === "ocr") {
        await startOcrSession("OCR 优先：正在识别视频画面里的英文烧录字幕。");
        return;
      }
      if (sourceMode === "captions") throw new Error("该视频没有可读取的字幕轨，请切换为“播放音频识别”");
      const media = await captureAudio(target, stop);
      if (!media.getAudioTracks().length) { media.getTracks().forEach((track) => track.stop()); throw new Error("电脑请勾选“共享音频”；手机请允许麦克风收音"); }
      stream.current = media; media.getTracks().forEach((track) => track.addEventListener("ended", stop, { once: true }));
      const localWorker = new Worker(new URL("../workers/transcription.worker.ts", import.meta.url), { type: "module" }); worker.current = localWorker;
      localWorker.onmessage = async (event: MessageEvent<{ type: string; status?: TranslationSession["status"]; text?: string; startedAt?: number; error?: string }>) => {
        if (event.data.type === "status") setSession((current) => ({ ...current, status: event.data.status ?? "loading_model" }));
        if (event.data.type === "error") { busy.current = false; setSession((current) => ({ ...current, status: "error", error: event.data.error })); }
      if (event.data.type === "result") {
          try {
            if (!event.data.text) return;
            await publishCue(event.data.text, "asr", event.data.startedAt ?? Date.now(), 0.86);
          } catch (error) { setSession((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "翻译失败" })); }
          finally { busy.current = false; }
        }
      };
      const audio = new AudioContext(); context.current = audio;
      const source = audio.createMediaStreamSource(media), node = audio.createScriptProcessor(4096, 1, 1); processor.current = node;
      const ratio = audio.sampleRate / SAMPLE_RATE;
      node.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0); for (let i = 0; i < input.length; i += ratio) samples.current.push(input[Math.floor(i)] ?? 0);
        if (samples.current.length >= SAMPLE_RATE * ASR_CHUNK_SECONDS && !busy.current) {
          const chunk = Float32Array.from(samples.current.splice(0, SAMPLE_RATE * ASR_CHUNK_SECONDS));
          if (audioRms(chunk) < MIN_AUDIO_RMS) return;
          busy.current = true;
          const model = settings.model === "accurate" || (settings.model === "auto" && (navigator.hardwareConcurrency ?? 4) >= 8) ? "accurate" : "fast";
          localWorker.postMessage({ type: "transcribe", audio: chunk, model, startedAt: Date.now() }, [chunk.buffer]);
        }
      };
      source.connect(node); node.connect(audio.destination); setSession({ status: "listening", model: settings.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : "无法开启实时字幕";
      stop();
      setSession({ status: "error", model: settings.model, error: message });
    }
  };

  if (!target || !box || box.bottom < 0 || box.top > innerHeight) return null;
  const active = !["idle", "error"].includes(session.status), subtitle = settings.subtitle;
  const buttonLeft = settings.button.edge === "right" ? box.right - settings.button.size - 14 : box.left + 14;
  const buttonTop = box.top + Math.max(12, Math.min(box.height - settings.button.size - 12, box.height * settings.button.y / 100));
  const updateSubtitle = (patch: Partial<SubtitleSettings["subtitle"]>) => setSettings((value) => ({ ...value, subtitle: { ...value.subtitle, ...patch } }));
  const beginButtonDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const startY = event.clientY; dragged.current = false;
    const move = (next: PointerEvent) => { if (Math.abs(next.clientY - startY) < 4) return; dragged.current = true; const y = Math.max(5, Math.min(95, (next.clientY - box.top) / box.height * 100)); const edge = next.clientX < box.left + box.width / 2 ? "left" : "right"; setSettings((value) => ({ ...value, button: { ...value.button, edge, y } })); };
    const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end, { once: true });
  };

  const showOriginal = cue && (settings.subtitleDisplay === "original" || settings.subtitleDisplay === "bilingual");
  const showTranslated = cue && (settings.subtitleDisplay === "translated" || settings.subtitleDisplay === "bilingual");
  const fixedTop = box.bottom - Math.max(64, Math.min(180, subtitle.verticalOffset || box.height * 0.18));
  const overlay = <>
    {cue && settings.subtitleDisplay !== "off" && <div role="status" aria-live="polite" className="fixed -translate-x-1/2 -translate-y-1/2 rounded px-2.5 py-1" style={{ zIndex: 9997, left: subtitle.mode === "floating" ? `${subtitle.floatingX}%` : box.left + box.width / 2, top: subtitle.mode === "floating" ? `${subtitle.floatingY}%` : fixedTop, width: `${subtitle.width}%`, maxWidth: box.width * subtitle.width / 100, color: subtitle.color, background: rgba(subtitle.background, subtitle.backgroundOpacity), textAlign: subtitle.align, lineHeight: 1.32, textShadow: subtitle.shadow ? "0 2px 6px #000" : "none", WebkitTextStroke: subtitle.outline ? "0.35px rgba(0,0,0,.72)" : "0", overflow: "hidden", pointerEvents: "none" }}>
      {showOriginal && <p className="m-0 line-clamp-2 text-[0.72em] font-medium opacity-90" style={{ fontSize: Math.max(12, Math.round(subtitle.fontSize * 0.68)) }}>{cue.originalText}</p>}
      {showTranslated && <p className="m-0 line-clamp-2" style={{ fontSize: subtitle.fontSize, fontWeight: Math.max(subtitle.fontWeight, 600) }}>{cue.translatedText}</p>}
      <p className="m-0 mt-0.5 text-[10px] font-medium opacity-55">Subtitle Source: {sourceLabel(cue.source)} · Confidence {Math.round(cue.confidence * 100)}%</p>
    </div>}
    <div className="fixed" style={{ zIndex: 9998, left: buttonLeft, top: buttonTop }}>
      <button onPointerDown={beginButtonDrag} className="focus-ring subtitle-fab flex items-center justify-center rounded-full border border-white/25 bg-black text-white shadow-xl" style={{ width: settings.button.size, height: settings.button.size, opacity: settings.button.opacity }} onClick={() => { if (dragged.current) { dragged.current = false; return; } if (active) stop(); else void start(); }} onContextMenu={(event) => { event.preventDefault(); setOpen(true); }} aria-label={active ? "停止实时字幕" : "开启实时字幕"}>{active ? <Pause size={20} weight="fill"/> : <Subtitles size={24} weight="bold"/>}</button>
      <button className="focus-ring absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black text-white" onClick={() => setOpen(true)} aria-label="字幕设置"><GearSix size={14}/></button>
      {active && !cue && <div className="absolute right-0 top-[calc(100%+10px)] w-max max-w-52 rounded-xl bg-black/85 px-3 py-2 text-xs text-white shadow-xl">{subtitleStatusLabel(session.status)}</div>}
    </div>
    {session.status === "error" && <div className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[9999] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-[#171816] px-4 py-3 text-sm text-white shadow-xl">{session.error}<button className="ml-3 underline" onClick={() => setSession({ status: "idle", model: settings.model })}>关闭</button></div>}
    {open && <aside role="dialog" aria-modal="true" aria-label="中文字幕设置" className="subtitle-settings-sheet surface fixed inset-x-3 bottom-3 z-[9999] max-h-[min(82dvh,720px)] overflow-auto rounded-2xl border line p-5 shadow-2xl md:inset-auto md:bottom-4 md:right-4 md:w-[min(360px,calc(100vw-2rem))]">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-center justify-between border-b line bg-[color:var(--surface)] px-5 py-4"><div><h2 className="font-semibold">中文字幕设置</h2><p className="mt-1 text-xs text-muted">{session.error ?? "样式只保存在本机"}</p></div><button className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-xl border line" onClick={() => setOpen(false)} aria-label="关闭"><X size={18}/></button></div>
      <div className="mt-5 rounded-xl bg-black p-5 text-center"><span className="inline-grid gap-1 rounded-md px-3 py-1.5" style={{ color: subtitle.color, background: rgba(subtitle.background, subtitle.backgroundOpacity) }}><span style={{ fontSize: Math.max(12, Math.round(subtitle.fontSize * 0.68)) }}>I&apos;m supposed to be the perfect fiancée.</span><span style={{ fontSize: Math.min(subtitle.fontSize, 26), fontWeight: Math.max(subtitle.fontWeight, 600) }}>我本该成为完美的未婚妻。</span></span></div>
      <div className="mt-5 grid gap-4 text-sm">
        <label className="grid gap-2 font-medium">字幕模式<select className="surface-strong rounded-xl border line px-3 py-2.5" value={settings.subtitleDisplay} onChange={(e) => setSettings((value) => ({ ...value, subtitleDisplay: e.target.value as SubtitleSettings["subtitleDisplay"] }))}><option value="translated">中文</option><option value="bilingual">双语</option><option value="original">English</option><option value="off">关闭</option></select></label>
        <label className="grid gap-2 font-medium">显示方式<select className="surface-strong rounded-xl border line px-3 py-2.5" value={subtitle.mode} onChange={(e) => updateSubtitle({ mode: e.target.value as "fixed" | "floating" })}><option value="fixed">固定在原字幕上方</option><option value="floating">自由悬浮</option></select></label>
        <label className="grid gap-2 font-medium">字号：{subtitle.fontSize}px<input type="range" min="14" max="42" value={subtitle.fontSize} onChange={(e) => updateSubtitle({ fontSize: Number(e.target.value) })}/></label>
        <label className="grid gap-2 font-medium">字幕高度<input type="range" min="24" max="220" value={subtitle.verticalOffset} onChange={(e) => updateSubtitle({ verticalOffset: Number(e.target.value) })}/></label>
        <label className="grid gap-2 font-medium">背景透明度<input type="range" min="0" max="1" step="0.05" value={subtitle.backgroundOpacity} onChange={(e) => updateSubtitle({ backgroundOpacity: Number(e.target.value) })}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 font-medium">文字颜色<input type="color" value={subtitle.color} onChange={(e) => updateSubtitle({ color: e.target.value })} className="h-10 w-full"/></label><label className="grid gap-2 font-medium">背景颜色<input type="color" value={subtitle.background} onChange={(e) => updateSubtitle({ background: e.target.value })} className="h-10 w-full"/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 font-medium">字重<select className="surface-strong rounded-xl border line px-3 py-2.5" value={subtitle.fontWeight} onChange={(e) => updateSubtitle({ fontWeight: Number(e.target.value) as 400 | 600 | 700 })}><option value="400">常规</option><option value="600">半粗</option><option value="700">粗体</option></select></label><label className="grid gap-2 font-medium">行数<select className="surface-strong rounded-xl border line px-3 py-2.5" value={subtitle.maxLines} onChange={(e) => updateSubtitle({ maxLines: Number(e.target.value) as 1 | 2 })}><option value="1">一行</option><option value="2">两行</option></select></label></div>
        <label className="grid gap-2 font-medium">字幕宽度：{subtitle.width}%<input type="range" min="40" max="96" value={subtitle.width} onChange={(e) => updateSubtitle({ width: Number(e.target.value) })}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={subtitle.outline} onChange={(e) => updateSubtitle({ outline: e.target.checked })}/>文字描边</label><label className="flex items-center gap-2"><input type="checkbox" checked={subtitle.shadow} onChange={(e) => updateSubtitle({ shadow: e.target.checked })}/>文字阴影</label></div>
        <label className="grid gap-2 font-medium">识别模式<select className="surface-strong rounded-xl border line px-3 py-2.5" value={settings.model} onChange={(e) => setSettings((value) => ({ ...value, model: e.target.value as SubtitleSettings["model"] }))}><option value="auto">自动选择</option><option value="fast">流畅优先</option><option value="accurate">准确优先</option></select></label>
        <label className="grid gap-2 font-medium">字幕来源<select className="surface-strong rounded-xl border line px-3 py-2.5" value={settings.sourceMode} onChange={(e) => setSettings((value) => ({ ...value, sourceMode: e.target.value as SubtitleSettings["sourceMode"] }))}><option value="ocr">OCR识别烧录字幕（推荐）</option><option value="audio">视频音频 ASR（备用）</option><option value="captions">原视频字幕轨</option><option value="auto">自动：字幕轨 → OCR</option></select></label>
        <button className="focus-ring pressable rounded-xl border line px-4 py-2.5 font-medium" onClick={() => setSettings(defaultSubtitleSettings)}>恢复默认设置</button>
      </div>
    </aside>}
  </>;
  return portalHost ? createPortal(overlay, portalHost) : overlay;
}
