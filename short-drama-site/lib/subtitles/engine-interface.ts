import type { SubtitleCue } from "@/lib/subtitles/types";

export type SubtitleEngineKind = "native_track" | "whisper_api" | "browser_extension" | "local_ai";

export interface SubtitleEngineInput {
  videoUrl: string;
  sourceLanguage?: string;
  targetLanguage?: "zh" | "en" | "bilingual";
}

export interface SubtitleEngine {
  kind: SubtitleEngineKind;
  label: string;
  available(): boolean | Promise<boolean>;
  start(input: SubtitleEngineInput, onCue: (cue: SubtitleCue) => void): Promise<() => void>;
}

export const reservedSubtitleEngines: Array<Pick<SubtitleEngine, "kind" | "label">> = [
  { kind: "whisper_api", label: "Whisper API" },
  { kind: "browser_extension", label: "Browser Extension" },
  { kind: "local_ai", label: "Local AI Recognition" },
];
