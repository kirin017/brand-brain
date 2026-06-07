import { describe, expect, it } from "vitest";
import { chooseApprovedAssetIdForSlot, normalizeRenderTag } from "./asset-matcher";
import type { BrandAsset, BrandAssetIndex } from "./types";

const index: BrandAssetIndex = {
  metadata: { schema_version: "0.1.0", language: "vi", status: "draft" },
  assets: [
    asset({
      id: "ban-mai-yen-mach",
      type: "product_photo",
      status: "approved",
      founder_confirmation_needed: false,
      product_tags: ["ban_mai", "yen_mach", "breakfast"],
      campaign_tags: ["ban_mai_breakfast"],
      visual_tags: ["warm", "natural", "product_clear"]
    }),
    asset({
      id: "detox-basic",
      type: "product_photo",
      status: "approved",
      founder_confirmation_needed: false,
      product_tags: ["detox", "drink"],
      campaign_tags: ["product_focus_drink"],
      visual_tags: ["warm", "natural", "product_clear"]
    }),
    asset({
      id: "approved-logo",
      type: "logo",
      status: "approved",
      founder_confirmation_needed: false
    }),
    asset({
      id: "unconfirmed-breakfast",
      type: "product_photo",
      status: "needs_founder_confirmation",
      founder_confirmation_needed: true,
      product_tags: ["ban_mai", "breakfast"],
      campaign_tags: ["ban_mai_breakfast"]
    }),
    asset({
      id: "unconfirmed-only",
      type: "product_photo",
      status: "needs_founder_confirmation",
      founder_confirmation_needed: true,
      product_tags: ["unconfirmed_only"]
    })
  ]
};

describe("normalizeRenderTag", () => {
  it("normalizes Vietnamese and spacing to stable tags", () => {
    expect(normalizeRenderTag("Ăn lành - Sống khỏe")).toBe("an_lanh_song_khoe");
    expect(normalizeRenderTag("Ban Mai Thức Giấc")).toBe("ban_mai_thuc_giac");
  });
});

describe("chooseApprovedAssetIdForSlot", () => {
  it("chooses an approved product photo with all required tags", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "main_image",
      type: "product_photo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: ["ban_mai", "breakfast"]
    })).toBe("ban-mai-yen-mach");
  });

  it("does not fallback to an unrelated approved product photo", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "main_image",
      type: "product_photo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: ["giot_lanh"]
    })).toBeUndefined();
  });

  it("allows logo selection without product tags", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "logo",
      type: "logo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: []
    })).toBe("approved-logo");
  });

  it("does not return an asset when slot and type are incompatible", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "logo",
      type: "product_photo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: ["ban_mai"]
    })).toBeUndefined();
  });

  it("does not return an unconfirmed asset even when tags match", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "main_image",
      type: "product_photo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: ["unconfirmed_only"]
    })).toBeUndefined();
  });
});

function asset(overrides: Partial<BrandAsset> & Pick<BrandAsset, "id" | "type">): BrandAsset {
  return {
    id: overrides.id,
    type: overrides.type,
    path: `assets/${overrides.id}.png`,
    status: overrides.status ?? "approved",
    allowed_channels: overrides.allowed_channels ?? ["Facebook"],
    allowed_formats: overrides.allowed_formats ?? ["facebook_square"],
    usage_notes: overrides.usage_notes ?? "Test asset.",
    founder_confirmation_needed: overrides.founder_confirmation_needed ?? false,
    product_tags: overrides.product_tags,
    campaign_tags: overrides.campaign_tags,
    visual_tags: overrides.visual_tags,
    best_for: overrides.best_for,
    avoid_for: overrides.avoid_for,
    approval_scope: overrides.approval_scope
  };
}
