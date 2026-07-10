import type { SubtitleSettings } from "@/lib/subtitles/types";

export const SUBTITLE_SETTINGS_KEY = "short-drama-subtitle-settings-v1";

export const defaultSubtitleSettings: SubtitleSettings = {
  subtitle: {
    mode: "fixed", fontSize: 20, fontWeight: 600, color: "#ffffff",
    background: "#050505", backgroundOpacity: 0.58, outline: true, shadow: true,
    maxLines: 2, width: 78, align: "center", verticalOffset: 128,
    floatingX: 50, floatingY: 72,
  },
  button: { size: 48, opacity: 0.94, edge: "right", y: 42, autoHideSeconds: 5, alwaysVisible: false },
  model: "auto",
  sourceMode: "audio",
  subtitleDisplay: "translated",
};

function numberIn(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function sanitizeSubtitleSettings(value: unknown): SubtitleSettings {
  if (!value || typeof value !== "object") return structuredClone(defaultSubtitleSettings);
  const candidate = value as Partial<SubtitleSettings>;
  const subtitle = candidate.subtitle ?? {} as SubtitleSettings["subtitle"];
  const button = candidate.button ?? {} as SubtitleSettings["button"];
  const defaults = defaultSubtitleSettings;
  return {
    model: ["auto", "fast", "accurate"].includes(String(candidate.model)) ? candidate.model! : defaults.model,
    sourceMode: ["auto", "captions", "ocr", "audio"].includes(String(candidate.sourceMode)) ? candidate.sourceMode! : defaults.sourceMode,
    subtitleDisplay: ["off", "original", "translated", "bilingual"].includes(String(candidate.subtitleDisplay)) ? candidate.subtitleDisplay! : defaults.subtitleDisplay,
    subtitle: {
      mode: subtitle.mode === "floating" ? "floating" : "fixed",
      fontSize: numberIn(subtitle.fontSize, 14, 42, defaults.subtitle.fontSize),
      fontWeight: [400, 600, 700].includes(Number(subtitle.fontWeight)) ? subtitle.fontWeight! : defaults.subtitle.fontWeight,
      color: /^#[0-9a-f]{6}$/i.test(subtitle.color ?? "") ? subtitle.color! : defaults.subtitle.color,
      background: /^#[0-9a-f]{6}$/i.test(subtitle.background ?? "") ? subtitle.background! : defaults.subtitle.background,
      backgroundOpacity: numberIn(subtitle.backgroundOpacity, 0, 1, defaults.subtitle.backgroundOpacity),
      outline: subtitle.outline !== false,
      shadow: subtitle.shadow !== false,
      maxLines: subtitle.maxLines === 1 ? 1 : 2,
      width: numberIn(subtitle.width, 40, 96, defaults.subtitle.width),
      align: subtitle.align === "left" ? "left" : "center",
      verticalOffset: numberIn(subtitle.verticalOffset, 24, 220, defaults.subtitle.verticalOffset),
      floatingX: numberIn(subtitle.floatingX, 5, 95, defaults.subtitle.floatingX),
      floatingY: numberIn(subtitle.floatingY, 5, 95, defaults.subtitle.floatingY),
    },
    button: {
      size: numberIn(button.size, 40, 64, defaults.button.size),
      opacity: numberIn(button.opacity, 0.5, 1, defaults.button.opacity),
      edge: button.edge === "left" ? "left" : "right",
      y: numberIn(button.y, 8, 88, defaults.button.y),
      autoHideSeconds: ([0, 3, 5, 10].includes(Number(button.autoHideSeconds)) ? button.autoHideSeconds : defaults.button.autoHideSeconds) as 0 | 3 | 5 | 10,
      alwaysVisible: button.alwaysVisible === true,
    },
  };
}

export function readSubtitleSettings(storage: Pick<Storage, "getItem"> | undefined) {
  if (!storage) return structuredClone(defaultSubtitleSettings);
  try { return sanitizeSubtitleSettings(JSON.parse(storage.getItem(SUBTITLE_SETTINGS_KEY) ?? "null")); }
  catch { return structuredClone(defaultSubtitleSettings); }
}
