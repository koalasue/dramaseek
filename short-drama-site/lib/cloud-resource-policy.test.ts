import { describe, expect, it } from "vitest";
import { validateCloudResourceInput } from "@/lib/cloud-resource-policy";

describe("cloud resource policy", () => {
  it("rejects a normal video URL because DramaSeek only records cloud links", () => {
    const result = validateCloudResourceInput({ cloudType: "baidu", cloudUrl: "https://www.dailymotion.com/video/xaiwylm" });
    expect(result).toMatchObject({ valid: false });
    expect(result.valid ? "" : result.error).toContain("不是百度网盘或夸克网盘链接");
  });

  it("rejects mismatched selected cloud type", () => {
    const result = validateCloudResourceInput({ cloudType: "baidu", cloudUrl: "https://pan.quark.cn/s/demo123" });
    expect(result).toMatchObject({ valid: false });
    expect(result.valid ? "" : result.error).toContain("链接类型与选择不一致");
  });

  it("accepts a Quark share link", () => {
    const result = validateCloudResourceInput({ cloudType: "quark", cloudUrl: "https://pan.quark.cn/s/demo123" });
    expect(result).toMatchObject({ valid: true, cloudType: "quark", cloudUrl: "https://pan.quark.cn/s/demo123" });
  });

  it("accepts a Baidu share link", () => {
    const result = validateCloudResourceInput({ cloudType: "baidu", cloudUrl: "https://pan.baidu.com/s/1demo" });
    expect(result).toMatchObject({ valid: true, cloudType: "baidu", cloudUrl: "https://pan.baidu.com/s/1demo" });
  });

  it("allows a pending cloud record when the source cannot be saved directly", () => {
    const result = validateCloudResourceInput({
      cloudType: "quark",
      sourceUrl: "https://www.dailymotion.com/video/xaiwylm",
      status: "processing",
    });
    expect(result).toMatchObject({
      valid: true,
      cloudType: "quark",
      cloudUrl: "https://www.dailymotion.com/video/xaiwylm",
      status: "processing",
    });
  });
});
