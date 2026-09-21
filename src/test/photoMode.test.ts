import { describe, expect, it } from "vitest";
import { photoLayoutWidth, photoPreviewFontSize } from "@/lib/photoMode";

describe("photo mode geometry", () => {
  it("reduces layout width when zoom increases", () => {
    expect(photoLayoutWidth({ width: 900, scale: 1 })).toBe(900);
    expect(photoLayoutWidth({ width: 900, scale: 1.5 })).toBe(600);
  });

  it("makes preview text larger when zoom increases", () => {
    const normal = photoPreviewFontSize({ width: 900, scale: 1 }, 300, 12);
    const zoomed = photoPreviewFontSize({ width: 900, scale: 1.5 }, 300, 12);
    expect(zoomed).toBeGreaterThan(normal);
  });

  it("clamps unsafe zoom values", () => {
    expect(photoLayoutWidth({ width: 900, scale: 99 })).toBe(450);
    expect(photoLayoutWidth({ width: 900, scale: 0 })).toBe(900);
  });

  it("uses a compact, readable preset for one match", async () => {
    const { PHOTO_PRESETS, resolvePhotoMode, DEFAULT_PHOTO_MODE } = await import("@/lib/photoMode");
    expect(PHOTO_PRESETS.match.width).toBeLessThan(PHOTO_PRESETS.table.width);
    expect(resolvePhotoMode(DEFAULT_PHOTO_MODE, "match").layout).toBe("match");
  });
});