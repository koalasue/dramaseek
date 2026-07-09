export type TranslationStatus = "idle" | "requesting" | "loading_model" | "reading_ocr" | "listening" | "translating" | "error";
export type SubtitleMode = "fixed" | "floating";
export type ModelProfile = "auto" | "fast" | "accurate";

export interface SubtitleCue {
  id: string;
  startedAt: number;
  endedAt: number;
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
  confidence: number;
  source: "captions" | "asr" | "ocr";
}

export interface TranslationSession {
  status: TranslationStatus;
  detectedLanguage?: string;
  model: ModelProfile;
  currentCue?: SubtitleCue;
  latencyMs?: number;
  error?: string;
}

export interface SubtitlePreferences {
  mode: SubtitleMode;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  color: string;
  background: string;
  backgroundOpacity: number;
  outline: boolean;
  shadow: boolean;
  maxLines: 1 | 2;
  width: number;
  align: "left" | "center";
  verticalOffset: number;
  floatingX: number;
  floatingY: number;
}

export interface FloatingButtonPreferences {
  size: number;
  opacity: number;
  edge: "left" | "right";
  y: number;
  autoHideSeconds: 0 | 3 | 5 | 10;
  alwaysVisible: boolean;
}

export interface SubtitleSettings {
  subtitle: SubtitlePreferences;
  button: FloatingButtonPreferences;
  model: ModelProfile;
  sourceMode: "auto" | "captions" | "ocr" | "audio";
  subtitleDisplay: "off" | "original" | "translated" | "bilingual";
}
