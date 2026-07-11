import type { Metadata } from "next";
import { SubtitleTestWorkbench } from "@/components/subtitle-test-workbench";

export const metadata: Metadata = { title: "AI 字幕测试" };

export default function SubtitleTestPage() {
  return <section className="page-shell py-5 md:py-7">
    <header className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-[-.02em] md:text-2xl">AI 字幕测试</h1>
      <p className="mt-2 text-sm leading-6 text-muted">仅测试可控视频源：原始字幕轨、音频 ASR 和可控 video OCR。第三方 iframe 不参与字幕处理。</p>
    </header>
    <SubtitleTestWorkbench />
  </section>;
}
