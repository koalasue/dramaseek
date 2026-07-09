import { describe, expect, it } from "vitest";
import { classifyShortDramaCandidate } from "@/lib/content-classifier";

const base = { dramaTitle: "The Lion's Captive", pageTitle: "The Lion's Captive Full Episodes", durationSeconds: 2760, uploaderVerified: true, sourceProof: "NetShort official title page" };

describe("short drama content classifier", () => {
  it("accepts a verified full-series page", () => { expect(classifyShortDramaCandidate(base)).toMatchObject({ accepted: true, contentType: "full_series" }); });
  it("rejects explanations even when the title matches", () => { expect(classifyShortDramaCandidate({ ...base, pageTitle: "The Lion's Captive Ending Explained" }).accepted).toBe(false); });
  it("rejects trailers and reactions", () => { expect(classifyShortDramaCandidate({ ...base, pageTitle: "The Lion's Captive Trailer Reaction" }).accepted).toBe(false); });
  it("rejects an unverified uploader", () => { expect(classifyShortDramaCandidate({ ...base, uploaderVerified: false }).accepted).toBe(false); });
  it("rejects an unrelated drama", () => { expect(classifyShortDramaCandidate({ ...base, pageTitle: "Another Drama Full Episodes" }).accepted).toBe(false); });
});
