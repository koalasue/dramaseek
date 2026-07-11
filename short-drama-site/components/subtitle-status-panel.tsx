"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Cloud, Subtitles } from "@phosphor-icons/react";

type SubtitleState = "checking" | "available" | "unavailable";

function srtToVtt(value: string) {
  return `WEBVTT\n\n${value
    .replace(/\r+/g, "")
    .replace(/^\d+\n/gm, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .trim()}\n`;
}

function subtitleKind(url?: string) {
  if (!url) return null;
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".vtt")) return "vtt";
  if (pathname.endsWith(".srt")) return "srt";
  return null;
}

export function SubtitleStatusPanel({ controllable, subtitleUrl }: { controllable: boolean; subtitleUrl?: string }) {
  const [state, setState] = useState<SubtitleState>(controllable ? "checking" : "unavailable");
  const [label, setLabel] = useState("No subtitle available");

  useEffect(() => {
    if (!controllable) {
      setState("unavailable");
      setLabel("No subtitle available");
      return;
    }
    let disposed = false;
    let objectUrl = "";
    let foundSubtitle = false;

    const attachProvidedSubtitle = async (video: HTMLVideoElement) => {
      const kind = subtitleKind(subtitleUrl);
      if (!subtitleUrl || !kind || video.querySelector("track[data-dramaseek-subtitle]")) return;
      let src = subtitleUrl;
      if (kind === "srt") {
        const response = await fetch(subtitleUrl);
        if (!response.ok) return;
        objectUrl = URL.createObjectURL(new Blob([srtToVtt(await response.text())], { type: "text/vtt" }));
        src = objectUrl;
      }
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = "English";
      track.srclang = "en";
      track.src = src;
      track.default = true;
      track.dataset.dramaseekSubtitle = "true";
      video.appendChild(track);
    };

    const run = async () => {
      const video = document.querySelector("video[data-video-frame]") as HTMLVideoElement | null;
      if (!video) {
        setState("unavailable");
        return;
      }
      await attachProvidedSubtitle(video);
      const detect = () => {
        if (disposed) return;
        const tracks = Array.from(video.textTracks ?? []);
        const subtitleTracks = tracks.filter((track) => track.kind === "subtitles" || track.kind === "captions");
        if (subtitleTracks.length) {
          foundSubtitle = true;
          subtitleTracks[0].mode = "showing";
          setState("available");
          setLabel("English Subtitle Available");
        }
      };
      detect();
      video.addEventListener("loadedmetadata", detect);
      video.addEventListener("loadeddata", detect);
      video.textTracks?.addEventListener?.("addtrack", detect);
      window.setTimeout(detect, 500);
      window.setTimeout(() => {
        if (!disposed && !foundSubtitle) setState("unavailable");
      }, 1600);
      return () => {
        video.removeEventListener("loadedmetadata", detect);
        video.removeEventListener("loadeddata", detect);
        video.textTracks?.removeEventListener?.("addtrack", detect);
      };
    };

    let cleanup: (() => void) | undefined;
    void run().then((value) => { cleanup = value; }).catch(() => {
      if (!disposed) setState("unavailable");
    });
    return () => {
      disposed = true;
      cleanup?.();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [controllable, subtitleUrl]);

  const available = state === "available";
  return <section aria-label="字幕状态" className="surface mx-auto mt-4 max-w-3xl rounded-2xl border line p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><Subtitles size={18}/>Subtitle</h2>
        <p className="mt-1 text-xs text-muted">{state === "checking" ? "Checking subtitle tracks..." : available ? "✓ English Subtitle Available" : "No subtitle available"}</p>
      </div>
      {available ? <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"><CheckCircle size={15} weight="fill"/>{label}</span> : <a href="#cloud-backup" className="focus-ring accent-bg pressable inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold"><Cloud size={16}/>Watch with Cloud Subtitle</a>}
    </div>
  </section>;
}
