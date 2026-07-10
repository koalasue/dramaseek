import { describe, expect, it } from "vitest";
import { defaultSubtitleSettings, readSubtitleSettings, sanitizeSubtitleSettings } from "@/lib/subtitles/settings";

describe("subtitle settings", () => {
  it("uses readable defaults above native captions", () => {
    expect(defaultSubtitleSettings.subtitle).toMatchObject({ mode: "fixed", maxLines: 2, verticalOffset: 128 });
    expect(defaultSubtitleSettings.sourceMode).toBe("auto");
  });
  it("clamps unsafe persisted values", () => {
    const value = sanitizeSubtitleSettings({ subtitle: { fontSize: 999, width: 2, floatingY: -30 }, button: { size: 2, opacity: 9 } });
    expect(value.subtitle.fontSize).toBe(42); expect(value.subtitle.width).toBe(40); expect(value.button.size).toBe(40); expect(value.button.opacity).toBe(1);
  });
  it("recovers from corrupt local storage", () => {
    expect(readSubtitleSettings({ getItem: () => "{" })).toEqual(defaultSubtitleSettings);
  });
  it("keeps OCR source mode when persisted", () => {
    expect(sanitizeSubtitleSettings({ sourceMode: "ocr" }).sourceMode).toBe("ocr");
  });
  it("uses Chinese subtitle display mode by default", () => {
    expect(defaultSubtitleSettings.subtitleDisplay).toBe("translated");
    expect(sanitizeSubtitleSettings({ subtitleDisplay: "translated" }).subtitleDisplay).toBe("translated");
    expect(sanitizeSubtitleSettings({ subtitleDisplay: "bilingual" }).subtitleDisplay).toBe("bilingual");
  });
});
