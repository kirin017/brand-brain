import type { GeneratedOutput, GenerationInput } from "../types";
import { chooseApprovedAssetIdForSlot, normalizeRenderTag } from "./asset-matcher";
import { listMissingRequiredAssets } from "./assets";
import { getFacebookSquareTemplate } from "./facebook-square-templates";
import { buildRenderCopy } from "./render-copy";
import { nextStatusAfterTextCheck, type RenderJobStatus } from "./status";
import type { BrandAssetIndex, RenderFormat, RenderPlan, RenderTemplateId } from "./types";

const renderChannel = "Facebook";
const renderFormat: RenderFormat = "facebook_square";
const assetSlots = ["logo", "main_image", "background", "qr"] as const;

export function createFacebookSquareRenderPlan(
  input: GenerationInput,
  output: GeneratedOutput,
  assetIndex: BrandAssetIndex
): RenderPlan {
  const templateId = chooseTemplate(input);
  const template = getFacebookSquareTemplate(templateId);
  const assetIdsBySlot = chooseAssetIdsBySlot(input, assetIndex, templateId);
  const missingRequiredAssets = listMissingRequiredAssets(assetIndex, {
    requiredSlots: template.requiredAssetSlots,
    assetIdsBySlot,
    channel: renderChannel,
    format: renderFormat
  });

  const founderConfirmations = output.founderConfirmationNeeded.filter((item) => item.trim().length > 0);
  const renderCopy = buildRenderCopy(input, output);

  const baseStatus = nextStatusAfterTextCheck({
    complianceRisk: output.complianceCheck.riskLevel,
    missingRequiredAssets,
    unresolvedFounderConfirmations: founderConfirmations
  });
  const status = nextStatusAfterApprovalCheck(
    baseStatus,
    output.complianceCheck.humanApprovalRequired,
    templateId
  );

  return {
    status,
    status_reasons: buildStatusReasons({
      riskLevel: output.complianceCheck.riskLevel,
      humanApprovalRequired: output.complianceCheck.humanApprovalRequired,
      missingRequiredAssets,
      founderConfirmations
    }),
    payload: {
      job_id: createJobId(input, output),
      format: renderFormat,
      template_id: templateId,
      template_variant: chooseTemplateVariant(input),
      campaign: input.campaign,
      product_membership: input.productMembership,
      headline: renderCopy.headline,
      supporting_copy: renderCopy.supporting_copy,
      cta: renderCopy.cta,
      assets: buildPayloadAssets(assetIdsBySlot),
      compliance: {
        risk_level: output.complianceCheck.riskLevel,
        human_approval_required: output.complianceCheck.humanApprovalRequired || status === "needs_human_approval"
      },
      founder_confirmation_needed: founderConfirmations
    }
  };
}

function chooseTemplate(input: GenerationInput): RenderTemplateId {
  const text = normalize([
    input.outputType,
    input.goal,
    input.productMembership,
    input.campaign,
    input.channel,
    input.format,
    input.notes
  ].join(" "));

  if (text.includes("connected point") || text.includes("diem ban") || text.includes("qr")) {
    return "connected-point-posm";
  }
  if (text.includes("alliance") || text.includes("doi tac") || text.includes("hop tac")) {
    return "brand-alliance";
  }
  if (text.includes("ctv") || text.includes("affiliate") || text.includes("sale") || text.includes("leader")) {
    return "sale-ctv-recruitment";
  }
  if (text.includes("an lanh") || text.includes("song khoe") || text.includes("healthy living")) {
    return "an-lanh-song-khoe-community";
  }
  if (input.outputType === "zalo_group_content") {
    return "zalo-community";
  }
  if (text.includes("giot lanh")) {
    return "giot-lanh-membership";
  }
  if (text.includes("ban mai") || text.includes("thuc giac") || text.includes("breakfast")) {
    return "ban-mai-breakfast";
  }
  return "product-focus-drink";
}

function chooseTemplateVariant(input: GenerationInput): "A" | "B" | "C" {
  const text = normalize(input.notes);
  if (text.includes("variant b") || text.includes("bien the b")) return "B";
  if (text.includes("variant c") || text.includes("bien the c")) return "C";
  return "A";
}

function chooseAssetIdsBySlot(
  input: GenerationInput,
  assetIndex: BrandAssetIndex,
  templateId: RenderTemplateId
): Record<string, string | undefined> {
  const requiredProductTags = buildRequiredProductTags(input, templateId);
  const mainImage = chooseApprovedAssetIdForSlot(assetIndex, {
    slot: "main_image",
    type: "product_photo",
    channel: renderChannel,
    format: renderFormat,
    requiredTags: requiredProductTags
  });
  const logo = chooseApprovedAssetIdForSlot(assetIndex, {
    slot: "logo",
    type: "logo",
    channel: renderChannel,
    format: renderFormat,
    requiredTags: []
  });
  const background = chooseApprovedAssetIdForSlot(assetIndex, {
    slot: "background",
    type: "background",
    channel: renderChannel,
    format: renderFormat,
    requiredTags: [templateId]
  });
  const qr = chooseApprovedAssetIdForSlot(assetIndex, {
    slot: "qr",
    type: "qr",
    channel: renderChannel,
    format: renderFormat,
    requiredTags: []
  });

  return { logo, main_image: mainImage, background, qr };
}

function buildRequiredProductTags(input: GenerationInput, templateId: RenderTemplateId): string[] {
  if (templateId === "ban-mai-breakfast") return ["ban_mai", "breakfast"];
  if (templateId === "product-focus-drink") return [normalizeRenderTag(input.productMembership)];
  return [];
}

function buildPayloadAssets(assetIdsBySlot: Record<string, string | undefined>): RenderPlan["payload"]["assets"] {
  const assets: RenderPlan["payload"]["assets"] = {};

  for (const slot of assetSlots) {
    const assetId = assetIdsBySlot[slot];
    if (assetId) {
      assets[slot] = assetId;
    }
  }

  return assets;
}

function nextStatusAfterApprovalCheck(
  status: RenderJobStatus,
  humanApprovalRequired: boolean,
  templateId: RenderTemplateId
): RenderJobStatus {
  if (
    status === "ready_for_render" &&
    (humanApprovalRequired || templateId === "an-lanh-song-khoe-community")
  ) {
    return "needs_human_approval";
  }

  return status;
}

function createJobId(input: GenerationInput, output: GeneratedOutput): string {
  const day = new Date().toISOString().slice(0, 10);
  const hash = createStableHash([
    input.campaign,
    input.productMembership,
    output.copy.headline,
    output.salesCommunityCta
  ]);
  const slugParts = [slugify(input.campaign), slugify(input.productMembership)].filter(Boolean);
  return [day, "facebook", ...slugParts, hash].join("-");
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createStableHash(values: string[]): string {
  const value = values.map(normalize).join("|");
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(36).padStart(8, "0").slice(-8);
}

function buildStatusReasons(input: {
  riskLevel: string;
  humanApprovalRequired: boolean;
  missingRequiredAssets: string[];
  founderConfirmations: string[];
}): string[] {
  const reasons: string[] = [];

  if (input.riskLevel === "High") {
    reasons.push("Compliance risk is High");
  }

  reasons.push(...input.missingRequiredAssets.map((slot) => `Missing approved asset for slot: ${slot}`));

  if (input.riskLevel === "Medium") {
    reasons.push("Compliance risk is Medium and requires human approval");
  }

  if (input.humanApprovalRequired) {
    reasons.push("Compliance check requires human approval");
  }

  reasons.push(...input.founderConfirmations.map((item) => `Founder confirmation required: ${item}`));

  return reasons;
}
