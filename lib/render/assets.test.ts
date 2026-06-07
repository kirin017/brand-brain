import { describe, expect, it } from "vitest";
import {
  findApprovedAsset,
  listMissingRequiredAssets,
  validateAssetIndex
} from "./assets";
import type { BrandAsset, BrandAssetIndex } from "./types";

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

function createAsset(id: string): BrandAsset {
  return {
    id,
    type: "product_photo",
    path: `assets/products/${id}.png`,
    status: "approved",
    allowed_channels: ["Facebook"],
    allowed_formats: ["facebook_square"],
    usage_notes: "Approved test asset.",
    founder_confirmation_needed: false
  };
}

function createAssetIndex(assets: unknown[]): BrandAssetIndex {
  return {
    metadata: {
      schema_version: "0.1.0",
      language: "vi",
      status: "draft"
    },
    assets: assets as BrandAsset[]
  };
}

describe("asset selection", () => {
  it("validates an asset index shape", () => {
    expect(validateAssetIndex(index).valid).toBe(true);
  });

  it("accepts optional asset tag metadata fields", () => {
    const index = createAssetIndex([
      {
        ...createAsset("ban-mai-yen-mach"),
        product_tags: ["ban_mai", "yen_mach", "breakfast"],
        campaign_tags: ["ban_mai_breakfast"],
        visual_tags: ["warm", "natural", "product_clear"],
        best_for: ["Ban Mai breakfast Facebook square"],
        avoid_for: ["detox product post"],
        approval_scope: "internal_test"
      }
    ]);

    expect(validateAssetIndex(index)).toEqual({ valid: true, errors: [] });
  });

  it("rejects asset tag metadata that is not an array of strings", () => {
    const index = createAssetIndex([
      {
        ...createAsset("bad-tags"),
        product_tags: ["ban_mai", 123],
        campaign_tags: "ban_mai_breakfast",
        visual_tags: [null],
        best_for: [false],
        avoid_for: [{}],
        approval_scope: 42
      }
    ] as unknown as BrandAsset[]);

    const validation = validateAssetIndex(index);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("bad-tags: product_tags must contain strings only");
    expect(validation.errors).toContain("bad-tags: campaign_tags must be an array");
    expect(validation.errors).toContain("bad-tags: visual_tags must contain strings only");
    expect(validation.errors).toContain("bad-tags: best_for must contain strings only");
    expect(validation.errors).toContain("bad-tags: avoid_for must contain strings only");
    expect(validation.errors).toContain("bad-tags: approval_scope must be a string");
  });

  it("returns invalid without throwing for malformed root values", () => {
    for (const value of [null, undefined, "invalid", 42, true]) {
      expect(() => validateAssetIndex(value)).not.toThrow();

      const validation = validateAssetIndex(value);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    }
  });

  it("is invalid when the root object has an unknown field", () => {
    const invalid = {
      ...index,
      source: "manual"
    };

    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: ["unsupported root field source"]
    });
  });

  it("is invalid when metadata notes is present as a non-string", () => {
    const invalid = {
      ...index,
      metadata: {
        ...index.metadata,
        notes: 123
      }
    };

    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: ["metadata.notes must be a string"]
    });
  });

  it("is invalid when metadata has an unknown field", () => {
    const invalid = {
      ...index,
      metadata: {
        ...index.metadata,
        owner: "BYT"
      }
    };

    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: ["metadata: unsupported field owner"]
    });
  });

  it("is invalid when an asset is missing usage_notes", () => {
    const invalid = {
      metadata: {
        schema_version: "0.1.0",
        language: "vi",
        status: "draft"
      },
      assets: [
        {
          id: "logo_missing_notes",
          type: "logo",
          path: "assets/logos/logoBYTconen.png",
          status: "approved",
          allowed_channels: ["Facebook"],
          allowed_formats: ["facebook_square"],
          founder_confirmation_needed: false
        }
      ]
    };

    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: ["logo_missing_notes: usage_notes must be a string"]
    });
  });

  it("returns validation errors without throwing when assets is not an array", () => {
    const invalid = {
      metadata: {
        schema_version: "0.1.0",
        language: "vi",
        status: "draft"
      },
      assets: {}
    };

    expect(() => validateAssetIndex(invalid)).not.toThrow();
    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: ["assets must be an array"]
    });
  });

  it("returns validation errors without throwing when asset items are not objects", () => {
    const invalid = {
      metadata: {
        schema_version: "0.1.0",
        language: "vi",
        status: "draft"
      },
      assets: [null, "invalid"]
    };

    expect(() => validateAssetIndex(invalid)).not.toThrow();
    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: ["asset[0] must be an object", "asset[1] must be an object"]
    });
  });

  it("is invalid when asset type or status is outside allowed values", () => {
    const invalid = {
      metadata: {
        schema_version: "0.1.0",
        language: "vi",
        status: "draft"
      },
      assets: [
        {
          id: "asset_invalid_type_status",
          type: "illustration",
          path: "assets/logos/logoBYTconen.png",
          status: "pending",
          allowed_channels: ["Facebook"],
          allowed_formats: ["facebook_square"],
          usage_notes: "Invalid enum values.",
          founder_confirmation_needed: false
        }
      ]
    };

    expect(validateAssetIndex(invalid)).toEqual({
      valid: false,
      errors: [
        "asset_invalid_type_status: asset.type must be one of logo, product_photo, background, lifestyle_reference, qr, design_token",
        "asset_invalid_type_status: asset.status must be one of draft, needs_founder_confirmation, approved, restricted, do_not_use"
      ]
    });
  });

  it("returns approved assets only", () => {
    expect(findApprovedAsset(index, "logo_approved", "Facebook", "facebook_square")?.id).toBe("logo_approved");
    expect(findApprovedAsset(index, "product_unconfirmed", "Facebook", "facebook_square")).toBeNull();
  });

  it("returns null for approved assets when channel or format does not match", () => {
    const formatMismatchIndex: BrandAssetIndex = {
      ...index,
      assets: index.assets.map((asset) =>
        asset.id === "logo_approved"
          ? { ...asset, allowed_formats: [] }
          : asset
      )
    };

    expect(findApprovedAsset(index, "logo_approved", "Instagram", "facebook_square")).toBeNull();
    expect(findApprovedAsset(formatMismatchIndex, "logo_approved", "Facebook", "facebook_square")).toBeNull();
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
