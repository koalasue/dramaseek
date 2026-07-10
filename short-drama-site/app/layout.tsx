import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { VideoSubtitleEnhancer } from "@/components/video-subtitle-enhancer";

export const metadata: Metadata = {
  title: { default: "短剧寻址", template: "%s | 短剧寻址" },
  description: "搜索海外短剧的正版来源，一次查看多个平台的官方观看入口。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <VideoSubtitleEnhancer />
      </body>
    </html>
  );
}
