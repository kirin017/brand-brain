import type { GeneratedOutput, GenerationInput } from "../types";
import { findApprovedAsset, listMissingRequiredAssets } from "./assets";
import { getFacebookSquareTemplate } from "./facebook-square-templates";
import { nextStatusAfterTextCheck, type RenderJobStatus } from "./status";
import type { BrandAsset, BrandAssetIndex, RenderFormat, RenderPlan, RenderTemplateId } from "./types";

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
  const assetIdsBySlot = chooseAssetIdsBySlot(input, assetIndex);
  const missingRequiredAssets = listMissingRequiredAssets(assetIndex, {
    requiredSlots: template.requiredAssetSlots,
    assetIdsBySlot,
    channel: renderChannel,
    format: renderFormat
  });

  const founderConfirmations = output.founderConfirmationNeeded.filter((item) => item.trim().length > 0);

  const baseStatus = nextStatusAfterTextCheck({
    complianceRisk: output.complianceCheck.riskLevel,
    missingRequiredAssets,
    unresolvedFounderConfirmations: founderConfirmations
  });
  const status = nextStatusAfterApprovalCheck(baseStatus, output.complianceCheck.humanApprovalRequired);

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
      campaign: input.campaign,
      product_membership: input.productMembership,
      headline: output.copy.headline,
      supporting_copy: output.copy.supportingCopy[0] ?? output.designBrief.mainMessage,
      cta: output.salesCommunityCta,
      assets: buildPayloadAssets(assetIndex, assetIdsBySlot),
      compliance: {
        risk_level: output.complianceCheck.riskLevel,
        human_approval_required: output.complianceCheck.humanApprovalRequired || status === "needs_human_approval"
      },
      founder_confirmation_needed: founderConfirmations
    }
  };
}

function chooseTemplate(input: GenerationInput): RenderTemplateId {
  if (input.outputType === "zalo_group_content") return "community-focus";
  if (input.outputType === "membership_campaign_content") return "membership-focus";
  if (input.productMembership.toLowerCase().includes("thức giấc")) return "membership-focus";
  if (input.productMembership.toLowerCase().includes("rực rỡ")) return "membership-focus";
  if (input.productMembership.toLowerCase().includes("giọt lành")) return "membership-focus";
  return "product-focus";
}

function chooseAssetIdsBySlot(
  input: GenerationInput,
  assetIndex: BrandAssetIndex
): Record<string, string | undefined> {
  const productSearch = normalize(input.productMembership);
  const mainImage = chooseCandidateAssetId(assetIndex, (asset) => {
    const haystack = normalize(`${asset.id} ${asset.usage_notes}`);
    return asset.type === "product_photo" && haystack.includes(productSearch);
  });

  const logo = chooseCandidateAssetId(assetIndex, (asset) => asset.type === "logo");
  const background = chooseCandidateAssetId(assetIndex, (asset) => asset.type === "background");
  const qr = chooseCandidateAssetId(assetIndex, (asset) => asset.type === "qr");

  return {
    logo,
    main_image: mainImage,
    background,
    qr
  };
}

function chooseCandidateAssetId(
  assetIndex: BrandAssetIndex,
  predicate: (asset: BrandAsset) => boolean
): string | undefined {
  const candidates = assetIndex.assets.filter(predicate);
  const eligible = candidates.find((asset) => findApprovedAsset(assetIndex, asset.id, renderChannel, renderFormat));
  return eligible?.id ?? candidates[0]?.id;
}

function buildPayloadAssets(
  assetIndex: BrandAssetIndex,
  assetIdsBySlot: Record<string, string | undefined>
): RenderPlan["payload"]["assets"] {
  const assets: RenderPlan["payload"]["assets"] = {};

  for (const slot of assetSlots) {
    const asset = findApprovedAsset(assetIndex, assetIdsBySlot[slot], renderChannel, renderFormat);
    if (asset) {
      assets[slot] = asset.id;
    }
  }

  return assets;
}

function nextStatusAfterApprovalCheck(status: RenderJobStatus, humanApprovalRequired: boolean): RenderJobStatus {
  if (status === "ready_for_render" && humanApprovalRequired) {
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
