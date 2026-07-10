import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { SubtitleTestWorkbench } from "@/components/subtitle-test-workbench";

export const metadata: Metadata = { title: "AI字幕测试 | DramaSeek" };

export default function SubtitleTestPage() {
  return <main className="page-shell py-5 md:py-7">
    <Link href="/" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border line px-3 text-sm font-medium"><ArrowLeft size={16}/>返回首页</Link>
    <header className="mt-4 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-[-.02em] md:text-2xl">AI字幕测试</h1>
      <p className="mt-2 text-sm leading-6 text-muted">上传短视频片段，验证字幕来源优先级、音频识别、翻译和视频内部 Overlay 显示。</p>
    </header>
    <SubtitleTestWorkbench />
  </main>;
}
