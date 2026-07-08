"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GearSix, Pause, Subtitles, X } from "@phosphor-icons/react";
import { defaultSubtitleSettings, readSubtitleSettings, SUBTITLE_SETTINGS_KEY } from "@/lib/subtitles/settings";
import type { SubtitleCue, SubtitleSettings, TranslationSession } from "@/lib/subtitles/types";

const SAMPLE_RATE = 16_000;

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

async function translate(text: string) {
  if (typeof LanguageDetector === "undefined" || typeof Translator === "undefined") throw new Error("本地翻译需要 Chrome 138 或更高版本");
  const detector = await LanguageDetector.create();
  const [result] = await detector.detect(text);
  const language = result?.detectedLanguage ?? "en";
  if (language.startsWith("zh")) return { text, language };
  const translator = await Translator.create({ sourceLanguage: language, targetLanguage: "zh-Hans" });
  return { text: await translator.translate(text), language };
}

export function VideoSubtitleEnhancer() {
  const [target, setTarget] = useState<Element | null>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [settings, setSettings] = useState<SubtitleSettings>(defaultSubtitleSettings);
  const [open, setOpen] = useState(false);
  const [cue, setCue] = useState<SubtitleCue | null>(null);
  const [session, setSession] = useState<TranslationSession>({ status: "idle", model: "auto" });
  const worker = useRef<Worker | null>(null), stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null), processor = useRef<ScriptProcessorNode | null>(null);
  const samples = useRef<number[]>([]), busy = useRef(false), dragged = useRef(false);
  const captionCleanup = useRef<(() => void) | null>(null);

  useEffect(() => setSettings(readSubtitleSettings(localStorage)), []);
  useEffect(() => { localStorage.setItem(SUBTITLE_SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    const update = () => { const found = largestVideo(); setTarget(found); setBox(found?.getBoundingClientRect() ?? null); };
    update(); const observer = new MutationObserver(update); observer.observe(document.documentElement, { subtree: true, childList: true });
    const timer = window.setInterval(update, 1000); window.addEventListener("resize", update); document.addEventListener("fullscreenchange", update);
    return () => { observer.disconnect(); clearInterval(timer); window.removeEventListener("resize", update); document.removeEventListener("fullscreenchange", update); };
  }, []);

  const stop = useCallback(() => {
    captionCleanup.current?.(); captionCleanup.current = null;
    processor.current?.disconnect(); processor.current = null; void context.current?.close(); context.current = null;
    stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
    worker.current?.terminate(); worker.current = null; samples.current = []; busy.current = false; setCue(null);
    setSession({ status: "idle", model: settings.model });
  }, [settings.model]);
  useEffect(() => stop, [stop]);

  const start = async () => {
    try {
      setSession({ status: "requesting", model: settings.model });
      if (settings.sourceMode !== "audio" && target instanceof HTMLVideoElement && target.textTracks.length) {
        const track = [...target.textTracks].find((item) => item.kind === "subtitles" || item.kind === "captions") ?? target.textTracks[0];
        track.mode = "hidden";
        const onCue = () => {
          const activeCue = track.activeCues?.[0] as VTTCue | undefined;
          if (!activeCue?.text) return;
          const startedAt = Date.now();
          void translate(activeCue.text).then((output) => {
            const next = { id: crypto.randomUUID(), startedAt, endedAt: Date.now(), detectedLanguage: output.language, translatedText: output.text, confidence: 1 };
            setCue(next); setSession((current) => ({ ...current, status: "listening", detectedLanguage: output.language, currentCue: next, latencyMs: Date.now() - startedAt }));
          }).catch((error) => setSession((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "字幕翻译失败" })));
        };
        track.addEventListener("cuechange", onCue); captionCleanup.current = () => track.removeEventListener("cuechange", onCue);
        setSession({ status: "listening", model: settings.model }); onCue(); return;
      }
      if (settings.sourceMode === "captions") throw new Error("该视频没有可读取的字幕轨，请切换为“播放音频识别”");
      const media = navigator.mediaDevices.getDisplayMedia
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!media.getAudioTracks().length) { media.getTracks().forEach((track) => track.stop()); throw new Error("电脑请勾选“共享音频”；手机请允许麦克风收音"); }
      stream.current = media; media.getTracks().forEach((track) => track.addEventListener("ended", stop, { once: true }));
      const localWorker = new Worker(new URL("../workers/transcription.worker.ts", import.meta.url), { type: "module" }); worker.current = localWorker;
      localWorker.onmessage = async (event: MessageEvent<{ type: string; status?: TranslationSession["status"]; text?: string; startedAt?: number; error?: string }>) => {
        if (event.data.type === "status") setSession((current) => ({ ...current, status: event.data.status ?? "loading_model" }));
        if (event.data.type === "error") { busy.current = false; setSession((current) => ({ ...current, status: "error", error: event.data.error })); }
        if (event.data.type === "result") {
          try {
            if (!event.data.text) return;
            const output = await translate(event.data.text);
            const next = { id: crypto.randomUUID(), startedAt: event.data.startedAt ?? Date.now(), endedAt: Date.now(), detectedLanguage: output.language, translatedText: output.text, confidence: 1 };
            setCue(next); setSession((current) => ({ ...current, status: "listening", detectedLanguage: output.language, currentCue: next, latencyMs: Date.now() - next.startedAt }));
          } catch (error) { setSession((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "翻译失败" })); }
          finally { busy.current = false; }
        }
      };
      const audio = new AudioContext(); context.current = audio;
      const source = audio.createMediaStreamSource(media), node = audio.createScriptProcessor(4096, 1, 1); processor.current = node;
      const ratio = audio.sampleRate / SAMPLE_RATE;
      node.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0); for (let i = 0; i < input.length; i += ratio) samples.current.push(input[Math.floor(i)] ?? 0);
        if (samples.current.length >= SAMPLE_RATE * 1.6 && !busy.current) {
          busy.current = true; const chunk = Float32Array.from(samples.current.splice(0, SAMPLE_RATE * 1.6));
          const model = settings.model === "accurate" || (settings.model === "auto" && (navigator.hardwareConcurrency ?? 4) >= 8) ? "accurate" : "fast";
          localWorker.postMessage({ type: "transcribe", audio: chunk, model, startedAt: Date.now() }, [chunk.buffer]);
        }
      };
      source.connect(node); node.connect(audio.destination); setSession({ status: "listening", model: settings.model });
    } catch (error) { stop(); setSession({ status: "error", model: settings.model, error: error instanceof Error ? error.message : "无法开启实时字幕" }); }
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

  return <>
    {cue && <div role="status" aria-live="polite" className="fixed -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-2" style={{ zIndex: 70, left: subtitle.mode === "floating" ? `${subtitle.floatingX}%` : box.left + box.width / 2, top: subtitle.mode === "floating" ? `${subtitle.floatingY}%` : box.bottom - subtitle.verticalOffset, width: `${subtitle.width}%`, maxWidth: box.width * subtitle.width / 100, color: subtitle.color, background: rgba(subtitle.background, subtitle.backgroundOpacity), fontSize: subtitle.fontSize, fontWeight: subtitle.fontWeight, textAlign: subtitle.align, lineHeight: 1.45, textShadow: subtitle.shadow ? "0 2px 6px #000" : "none", WebkitTextStroke: subtitle.outline ? "1px rgba(0,0,0,.72)" : "0", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: subtitle.maxLines, overflow: "hidden" }}>{cue.translatedText}</div>}
    <div className="fixed" style={{ zIndex: 72, left: buttonLeft, top: buttonTop }}>
      <button onPointerDown={beginButtonDrag} className="focus-ring subtitle-fab flex items-center justify-center rounded-full border border-white/25 bg-black text-white shadow-xl" style={{ width: settings.button.size, height: settings.button.size, opacity: settings.button.opacity }} onClick={() => { if (dragged.current) { dragged.current = false; return; } if (active) stop(); else void start(); }} onContextMenu={(event) => { event.preventDefault(); setOpen(true); }} aria-label={active ? "停止实时字幕" : "开启实时字幕"}>{active ? <Pause size={20} weight="fill"/> : <Subtitles size={24} weight="bold"/>}</button>
      <button className="focus-ring absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black text-white" onClick={() => setOpen(true)} aria-label="字幕设置"><GearSix size={14}/></button>
    </div>
    {session.status === "error" && <div className="fixed left-1/2 top-5 z-[73] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-[#171816] px-4 py-3 text-sm text-white shadow-xl">{session.error}<button className="ml-3 underline" onClick={() => setSession({ status: "idle", model: settings.model })}>关闭</button></div>}
    {open && <aside role="dialog" aria-label="中文字幕设置" className="surface fixed bottom-4 right-4 z-[74] max-h-[calc(100vh-2rem)] w-[min(360px,calc(100vw-2rem))] overflow-auto rounded-2xl border line p-5 shadow-2xl">
      <div className="flex items-center justify-between"><div><h2 className="font-semibold">中文字幕设置</h2><p className="mt-1 text-xs text-muted">样式只保存在本机</p></div><button className="focus-ring rounded-lg p-2" onClick={() => setOpen(false)} aria-label="关闭"><X size={18}/></button></div>
      <div className="mt-5 rounded-xl bg-black p-5 text-center"><span className="rounded-lg px-3 py-2" style={{ color: subtitle.color, background: rgba(subtitle.background, subtitle.backgroundOpacity), fontSize: Math.min(subtitle.fontSize, 26), fontWeight: subtitle.fontWeight }}>实时中文字幕预览</span></div>
      <div className="mt-5 grid gap-4 text-sm">
        <label className="grid gap-2 font-medium">显示方式<select className="surface-strong rounded-xl border line px-3 py-2.5" value={subtitle.mode} onChange={(e) => updateSubtitle({ mode: e.target.value as "fixed" | "floating" })}><option value="fixed">固定在原字幕上方</option><option value="floating">自由悬浮</option></select></label>
        <label className="grid gap-2 font-medium">字号：{subtitle.fontSize}px<input type="range" min="14" max="42" value={subtitle.fontSize} onChange={(e) => updateSubtitle({ fontSize: Number(e.target.value) })}/></label>
        <label className="grid gap-2 font-medium">字幕高度<input type="range" min="24" max="220" value={subtitle.verticalOffset} onChange={(e) => updateSubtitle({ verticalOffset: Number(e.target.value) })}/></label>
        <label className="grid gap-2 font-medium">背景透明度<input type="range" min="0" max="1" step="0.05" value={subtitle.backgroundOpacity} onChange={(e) => updateSubtitle({ backgroundOpacity: Number(e.target.value) })}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 font-medium">文字颜色<input type="color" value={subtitle.color} onChange={(e) => updateSubtitle({ color: e.target.value })} className="h-10 w-full"/></label><label className="grid gap-2 font-medium">背景颜色<input type="color" value={subtitle.background} onChange={(e) => updateSubtitle({ background: e.target.value })} className="h-10 w-full"/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 font-medium">字重<select className="surface-strong rounded-xl border line px-3 py-2.5" value={subtitle.fontWeight} onChange={(e) => updateSubtitle({ fontWeight: Number(e.target.value) as 400 | 600 | 700 })}><option value="400">常规</option><option value="600">半粗</option><option value="700">粗体</option></select></label><label className="grid gap-2 font-medium">行数<select className="surface-strong rounded-xl border line px-3 py-2.5" value={subtitle.maxLines} onChange={(e) => updateSubtitle({ maxLines: Number(e.target.value) as 1 | 2 })}><option value="1">一行</option><option value="2">两行</option></select></label></div>
        <label className="grid gap-2 font-medium">字幕宽度：{subtitle.width}%<input type="range" min="40" max="96" value={subtitle.width} onChange={(e) => updateSubtitle({ width: Number(e.target.value) })}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={subtitle.outline} onChange={(e) => updateSubtitle({ outline: e.target.checked })}/>文字描边</label><label className="flex items-center gap-2"><input type="checkbox" checked={subtitle.shadow} onChange={(e) => updateSubtitle({ shadow: e.target.checked })}/>文字阴影</label></div>
        <label className="grid gap-2 font-medium">识别模式<select className="surface-strong rounded-xl border line px-3 py-2.5" value={settings.model} onChange={(e) => setSettings((value) => ({ ...value, model: e.target.value as SubtitleSettings["model"] }))}><option value="auto">自动选择</option><option value="fast">流畅优先</option><option value="accurate">准确优先</option></select></label>
        <label className="grid gap-2 font-medium">翻译来源<select className="surface-strong rounded-xl border line px-3 py-2.5" value={settings.sourceMode} onChange={(e) => setSettings((value) => ({ ...value, sourceMode: e.target.value as SubtitleSettings["sourceMode"] }))}><option value="auto">自动：优先原字幕</option><option value="captions">仅翻译视频字幕</option><option value="audio">按播放音频识别</option></select></label>
        <button className="focus-ring pressable rounded-xl border line px-4 py-2.5 font-medium" onClick={() => setSettings(defaultSubtitleSettings)}>恢复默认设置</button>
      </div>
    </aside>}
  </>;
}
