import { describe, expect, it } from "vitest";
import { createFacebookSquareRenderPlan } from "./render-planner";
import type { GeneratedOutput, GenerationInput } from "../types";
import type { BrandAssetIndex } from "./types";

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

describe("render planner", () => {
  it("blocks product-style membership output when required main image is missing", () => {
    const plan = createFacebookSquareRenderPlan(input, output, assets);
    expect(plan.payload.template_id).toBe("membership-focus");
    expect(plan.status).toBe("blocked_for_missing_asset");
    expect(plan.status_reasons).toContain("Missing approved asset for slot: main_image");
  });

  it("uses community-focus when output type is Zalo/community-like and no main image is required", () => {
    const communityPlan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      { ...output, founderConfirmationNeeded: [] },
      assets
    );
    expect(communityPlan.payload.template_id).toBe("community-focus");
    expect(communityPlan.status).toBe("ready_for_render");
  });
});
