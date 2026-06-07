import { describe, expect, it } from "vitest";
import { buildRenderCopy, isInternalRenderCopyLine } from "./render-copy";
import type { GeneratedOutput, GenerationInput } from "../types";

describe("isInternalRenderCopyLine", () => {
  it("detects internal tone and founder confirmation lines", () => {
    expect(isInternalRenderCopyLine("Tone: Ấm áp, thực tế")).toBe(true);
    expect(isInternalRenderCopyLine("Cần founder xác nhận màu")).toBe(true);
    expect(isInternalRenderCopyLine("Một bữa sáng nhỏ, dễ bắt đầu.")).toBe(false);
  });
});

describe("buildRenderCopy", () => {
  it("uses publication-ready supporting copy instead of internal tone notes", () => {
    const copy = buildRenderCopy(input(), output({
      supportingCopy: [
        "Tone: Ấm áp, thực tế, không phán xét.",
        "Một bữa sáng nhỏ, dễ bắt đầu cho ngày bận rộn."
      ],
      mainMessage: "Giữ bữa sáng lành hơn mà không cần cầu kỳ."
    }));

    expect(copy.supporting_copy).toBe("Một bữa sáng nhỏ, dễ bắt đầu cho ngày bận rộn.");
  });

  it("falls back to design brief main message when all supporting lines are internal", () => {
    const copy = buildRenderCopy(input(), output({
      supportingCopy: ["Tone: Ấm áp."],
      mainMessage: "Giữ bữa sáng lành hơn mà không cần cầu kỳ."
    }));

    expect(copy.supporting_copy).toBe("Giữ bữa sáng lành hơn mà không cần cầu kỳ.");
  });
});

function input(): GenerationInput {
  return {
    outputType: "facebook_post_brief",
    goal: "Test",
    audience: "office_workers",
    productMembership: "Ban Mai Thức Giấc",
    campaign: "Ban Mai breakfast campaign",
    channel: "Facebook",
    format: "Facebook square post",
    offer: "",
    cta: "Nhắn Bếp",
    tone: "Ấm áp",
    notes: "",
    riskSensitivity: "balanced"
  };
}

function output(overrides: { supportingCopy: string[]; mainMessage: string }): GeneratedOutput {
  return {
    markdown: "",
    strategicAngle: [],
    copy: {
      headline: "Bữa sáng lành hơn",
      body: "",
      supportingCopy: overrides.supportingCopy
    },
    designBrief: {
      campaignAngle: "",
      audienceInsight: "",
      mainMessage: overrides.mainMessage,
      visualConcept: "",
      layoutStructure: [],
      colorDirection: "",
      typographyDirection: "",
      imageDirection: "",
      iconIllustrationDirection: ""
    },
    salesCommunityCta: "Nhắn Bếp",
    complianceCheck: {
      riskLevel: "Low",
      detectedRisks: [],
      saferRewrite: "",
      humanApprovalRequired: true,
      recommendation: "Approved",
      checklist: []
    },
    brandCheckerScore: {
      brandFit: 8,
      visualFit: 8,
      voiceFit: 8,
      businessModelFit: 8,
      productAccuracy: 8,
      membershipAccuracy: 8,
      communityFit: 8,
      conversionClarity: 8,
      channelFit: 8,
      complianceRisk: "Low"
    },
    founderConfirmationNeeded: [],
    sourceFilesUsed: []
  };
}
