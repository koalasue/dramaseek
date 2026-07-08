import { MetadataAdapter } from "@/lib/adapters/base";

class PlatformAdapter extends MetadataAdapter { constructor(public platformId: string, public domains: string[]) { super(); } }
export const adapters = [
  new PlatformAdapter("youtube", ["youtube.com", "youtu.be"]),
  new PlatformAdapter("reelshort", ["reelshort.com"]),
  new PlatformAdapter("dramabox", ["dramabox.com"]),
  new PlatformAdapter("netshort", ["netshort.com"]),
  new PlatformAdapter("dailymotion", ["dailymotion.com", "dai.ly"]),
  new PlatformAdapter("tiktok", ["tiktok.com"])
];
export function adapterForUrl(url: URL) { return adapters.find((adapter) => adapter.canHandle(url)); }
