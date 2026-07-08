import type { AdapterResult } from "@/lib/types";

export interface SourceAdapter {
  platformId: string;
  canHandle(url: URL): boolean;
  discover(): Promise<AdapterResult[]>;
  inspect(url: URL): Promise<AdapterResult | null>;
}

export abstract class MetadataAdapter implements SourceAdapter {
  abstract platformId: string;
  abstract domains: string[];
  canHandle(url: URL) { return this.domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)); }
  async discover(): Promise<AdapterResult[]> { return []; }
  async inspect(): Promise<AdapterResult | null> { return null; }
}
