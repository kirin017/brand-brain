import { describe, expect, it } from "vitest";
import { createFacebookSquareRenderPlan } from "./render-planner";
import type { GeneratedOutput, GenerationInput } from "../types";
import type { BrandAsset, BrandAssetIndex } from "./types";

const input: GenerationInput = {
  outputType: "facebook_post_brief",
  goal: "Tạo post Ban Mai",
  audience: "office_workers",
  productMembership: "Ban Mai Thức Giấc",
  campaign: "Ban Mai breakfast campaign",
  channel: "Facebook",
  format: "Facebook square post",
  offer: "",
  cta: "Nhắn Bếp để được gợi ý.",
  tone: "Ấm áp, thực tế, không phán xét",
  notes: "",
  riskSensitivity: "balanced"
};

const output: GeneratedOutput = {
  strategicAngle: [],
  copy: {
    headline: "Bữa sáng lành hơn cho ngày bận rộn",
    body: "Body",
    supportingCopy: ["Một lựa chọn gọn, dễ duy trì cho buổi sáng."]
  },
  designBrief: {
    campaignAngle: "Breakfast",
    audienceInsight: "Busy",
    mainMessage: "Bữa sáng lành hơn",
    visualConcept: "Natural",
    layoutStructure: [],
    colorDirection: "Cần founder xác nhận",
    typographyDirection: "Cần founder xác nhận",
    imageDirection: "Ảnh sản phẩm thật",
    iconIllustrationDirection: "Icon tối giản"
  },
  salesCommunityCta: "Nhắn Bếp để được gợi ý.",
  complianceCheck: {
    riskLevel: "Low",
    detectedRisks: [],
    saferRewrite: "Safe",
    humanApprovalRequired: false,
    recommendation: "Approved",
    checklist: []
  },
  brandCheckerScore: {
    brandFit: 9,
    visualFit: 8,
    voiceFit: 9,
    businessModelFit: 9,
    productAccuracy: 8,
    membershipAccuracy: 8,
    communityFit: 8,
    conversionClarity: 9,
    channelFit: 8,
    complianceRisk: "Low"
  },
  founderConfirmationNeeded: [],
  sourceFilesUsed: [],
  markdown: "Markdown"
};

const assets: BrandAssetIndex = {
  metadata: { schema_version: "0.1.0", language: "vi", status: "draft" },
  assets: []
};

function createAsset(overrides: Partial<BrandAsset> & { id: string; type: BrandAsset["type"] }): BrandAsset {
  return {
    path: `assets/${overrides.id}.png`,
    status: "approved",
    allowed_channels: ["Facebook"],
    allowed_formats: ["facebook_square"],
    usage_notes: "",
    founder_confirmation_needed: false,
    ...overrides
  };
}

function approvedProduct(id: string, tags: string[]): BrandAsset {
  return {
    id,
    type: "product_photo",
    path: `assets/${id}.png`,
    status: "approved",
    allowed_channels: ["Facebook"],
    allowed_formats: ["facebook_square"],
    usage_notes: "Approved test product photo.",
    founder_confirmation_needed: false,
    product_tags: tags,
    campaign_tags: [],
    visual_tags: ["product_clear"]
  };
}

function createAssetIndex(assetList: BrandAsset[]): BrandAssetIndex {
  return {
    metadata: { schema_version: "0.1.0", language: "vi", status: "draft" },
    assets: assetList
  };
}

describe("render planner", () => {
  it("selects Ban Mai breakfast template for Ban Mai inputs", () => {
    const plan = createFacebookSquareRenderPlan(
      { ...input, productMembership: "Ban Mai Thức Giấc", campaign: "Ban Mai breakfast campaign" },
      output,
      createAssetIndex([approvedProduct("ban-mai-photo", ["ban_mai", "breakfast"])])
    );

    expect(plan.payload.template_id).toBe("ban-mai-breakfast");
  });

  it("selects eating clean healthy living community template for community input", () => {
    const plan = createFacebookSquareRenderPlan(
      {
        ...input,
        outputType: "zalo_group_content",
        productMembership: "Ăn lành - Sống khỏe",
        campaign: "Nurture nhóm ăn lành sống khỏe"
      },
      output,
      createAssetIndex([])
    );

    expect(plan.payload.template_id).toBe("an-lanh-song-khoe-community");
    expect(plan.status).toBe("needs_human_approval");
  });

  it("blocks Ban Mai render when approved product photo has the wrong tags", () => {
    const plan = createFacebookSquareRenderPlan(
      { ...input, productMembership: "Ban Mai Thức Giấc", campaign: "Ban Mai breakfast campaign" },
      output,
      createAssetIndex([approvedProduct("detox-photo", ["detox", "drink"])])
    );

    expect(plan.status).toBe("blocked_for_missing_asset");
    expect(plan.status_reasons).toContain("Missing approved asset for slot: main_image");
  });

  it("blocks product-style membership output when required main image is missing", () => {
    const plan = createFacebookSquareRenderPlan(input, output, assets);
    expect(plan.payload.template_id).toBe("ban-mai-breakfast");
    expect(plan.status).toBe("blocked_for_missing_asset");
    expect(plan.status_reasons).toContain("Missing approved asset for slot: main_image");
  });

  it("uses zalo-community when output type is Zalo/community-like and no main image is required", () => {
    const communityPlan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      { ...output, founderConfirmationNeeded: [] },
      assets
    );
    expect(communityPlan.payload.template_id).toBe("zalo-community");
    expect(communityPlan.status).toBe("ready_for_render");
  });

  it("uses an approved matching product photo as the main image and becomes ready", () => {
    const plan = createFacebookSquareRenderPlan(
      input,
      output,
      createAssetIndex([
        approvedProduct("ban-mai-thuc-giac-main-photo", ["ban_mai", "breakfast"])
      ])
    );

    expect(plan.status).toBe("ready_for_render");
    expect(plan.payload.assets.main_image).toBe("ban-mai-thuc-giac-main-photo");
  });

  it("does not emit an ineligible product photo and keeps the required image blocked", () => {
    const plan = createFacebookSquareRenderPlan(
      input,
      output,
      createAssetIndex([
        createAsset({
          id: "ban-mai-thuc-giac-draft-photo",
          type: "product_photo",
          status: "draft",
          usage_notes: "Ảnh sản phẩm Ban Mai Thức Giấc chưa duyệt",
          product_tags: ["ban_mai", "breakfast"]
        }),
        createAsset({
          id: "ban-mai-thuc-giac-founder-photo",
          type: "product_photo",
          founder_confirmation_needed: true,
          usage_notes: "Ảnh sản phẩm Ban Mai Thức Giấc cần founder xác nhận",
          product_tags: ["ban_mai", "breakfast"]
        })
      ])
    );

    expect(plan.status).toBe("blocked_for_missing_asset");
    expect(plan.status_reasons).toContain("Missing approved asset for slot: main_image");
    expect(plan.payload.assets).not.toHaveProperty("main_image");
  });

  it("does not include optional logo or background unless they are eligible for the render", () => {
    const plan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      output,
      createAssetIndex([
        createAsset({
          id: "byt-logo-needs-founder",
          type: "logo",
          founder_confirmation_needed: true
        }),
        createAsset({
          id: "byt-background-zalo-only",
          type: "background",
          allowed_channels: ["Zalo"]
        })
      ])
    );

    expect(plan.status).toBe("ready_for_render");
    expect(plan.payload.assets).not.toHaveProperty("logo");
    expect(plan.payload.assets).not.toHaveProperty("background");
  });

  it("puts high compliance risk first in status reasons", () => {
    const plan = createFacebookSquareRenderPlan(
      input,
      { ...output, complianceCheck: { ...output.complianceCheck, riskLevel: "High" } },
      assets
    );

    expect(plan.status).toBe("blocked_for_compliance");
    expect(plan.status_reasons[0]).toBe("Compliance risk is High");
  });

  it("requires human approval and records a reason for medium compliance risk", () => {
    const plan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      { ...output, complianceCheck: { ...output.complianceCheck, riskLevel: "Medium" } },
      assets
    );

    expect(plan.status).toBe("needs_human_approval");
    expect(plan.status_reasons).toContain("Compliance risk is Medium and requires human approval");
  });

  it("requires human approval when the compliance check explicitly asks for it", () => {
    const plan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      { ...output, complianceCheck: { ...output.complianceCheck, humanApprovalRequired: true } },
      assets
    );

    expect(plan.status).toBe("needs_human_approval");
    expect(plan.status_reasons).toContain("Compliance check requires human approval");
  });

  it("keeps founder confirmations in the payload and requires human approval", () => {
    const founderConfirmation = "Founder duyệt câu chuyện hội viên";
    const plan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      { ...output, founderConfirmationNeeded: [founderConfirmation] },
      assets
    );

    expect(plan.status).toBe("needs_human_approval");
    expect(plan.payload.founder_confirmation_needed).toEqual([founderConfirmation]);
    expect(plan.status_reasons).toContain(`Founder confirmation required: ${founderConfirmation}`);
  });

  it("does not include asset keys with undefined values", () => {
    const plan = createFacebookSquareRenderPlan(input, output, assets);

    expect(Object.values(plan.payload.assets)).not.toContain(undefined);
  });

  it("creates a path-safe job id with a hash-like suffix", () => {
    const plan = createFacebookSquareRenderPlan(input, output, assets);

    expect(plan.payload.job_id).toMatch(/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{8}$/);
    expect(plan.payload.job_id).not.toMatch(/[\\/]/);
  });
});
