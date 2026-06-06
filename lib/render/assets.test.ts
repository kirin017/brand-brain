import { describe, expect, it } from "vitest";
import {
  findApprovedAsset,
  listMissingRequiredAssets,
  validateAssetIndex
} from "./assets";
import type { BrandAssetIndex } from "./types";

const index: BrandAssetIndex = {
  metadata: {
    schema_version: "0.1.0",
    language: "vi",
    status: "draft"
  },
  assets: [
    {
      id: "logo_approved",
      type: "logo",
      path: "assets/logos/logoBYTconen.png",
      status: "approved",
      allowed_channels: ["Facebook"],
      allowed_formats: ["facebook_square"],
      usage_notes: "Approved test logo.",
      founder_confirmation_needed: false
    },
    {
      id: "product_unconfirmed",
      type: "product_photo",
      path: "assets/products/sample.png",
      status: "needs_founder_confirmation",
      allowed_channels: ["Facebook"],
      allowed_formats: ["facebook_square"],
      usage_notes: "Not final.",
      founder_confirmation_needed: true
    }
  ]
};

describe("asset selection", () => {
  it("validates an asset index shape", () => {
    expect(validateAssetIndex(index).valid).toBe(true);
  });

  it("returns approved assets only", () => {
    expect(findApprovedAsset(index, "logo_approved", "Facebook", "facebook_square")?.id).toBe("logo_approved");
    expect(findApprovedAsset(index, "product_unconfirmed", "Facebook", "facebook_square")).toBeNull();
  });

  it("lists missing required asset slots", () => {
    const missing = listMissingRequiredAssets(index, {
      requiredSlots: ["logo", "main_image"],
      assetIdsBySlot: {
        logo: "logo_approved",
        main_image: "product_unconfirmed"
      },
      channel: "Facebook",
      format: "facebook_square"
    });

    expect(missing).toEqual(["main_image"]);
  });
});
