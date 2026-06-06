import type { GeneratedOutput, GenerationInput } from "../types";
import { listMissingRequiredAssets } from "./assets";
import { getFacebookSquareTemplate } from "./facebook-square-templates";
import { nextStatusAfterTextCheck } from "./status";
import type { BrandAssetIndex, RenderPlan, RenderTemplateId } from "./types";

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
    channel: "Facebook",
    format: "facebook_square"
  });

  const founderConfirmations = output.founderConfirmationNeeded.filter((item) =>
    isBlockingFounderConfirmation(item)
  );

  const status = nextStatusAfterTextCheck({
    complianceRisk: output.complianceCheck.riskLevel,
    missingRequiredAssets,
    unresolvedFounderConfirmations: founderConfirmations
  });

  return {
    status,
    status_reasons: buildStatusReasons(missingRequiredAssets, founderConfirmations, output.complianceCheck.riskLevel),
    payload: {
      job_id: createJobId(input),
      format: "facebook_square",
      template_id: templateId,
      campaign: input.campaign,
      product_membership: input.productMembership,
      headline: output.copy.headline,
      supporting_copy: output.copy.supportingCopy[0] ?? output.designBrief.mainMessage,
      cta: output.salesCommunityCta,
      assets: {
        logo: assetIdsBySlot.logo,
        main_image: assetIdsBySlot.main_image,
        background: assetIdsBySlot.background,
        qr: assetIdsBySlot.qr
      },
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
  const mainImage = assetIndex.assets.find((asset) => {
    const haystack = normalize(`${asset.id} ${asset.usage_notes}`);
    return asset.type === "product_photo" && haystack.includes(productSearch);
  });

  const logo = assetIndex.assets.find((asset) => asset.type === "logo" && asset.status === "approved");
  const background = assetIndex.assets.find((asset) => asset.type === "background" && asset.status === "approved");

  return {
    logo: logo?.id,
    main_image: mainImage?.id,
    background: background?.id
  };
}

function createJobId(input: GenerationInput): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${day}-facebook-${slugify(input.campaign)}-${slugify(input.productMembership)}`;
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

function isBlockingFounderConfirmation(value: string): boolean {
  const normalized = normalize(value);
  return ["logo", "mau", "font", "qr", "gia", "quyen loi", "anh san pham", "bao bi"].some((term) =>
    normalized.includes(term)
  );
}

function buildStatusReasons(
  missingRequiredAssets: string[],
  founderConfirmations: string[],
  riskLevel: string
): string[] {
  const reasons = [
    ...missingRequiredAssets.map((slot) => `Missing approved asset for slot: ${slot}`),
    ...founderConfirmations.map((item) => `Founder confirmation required: ${item}`)
  ];

  if (riskLevel === "High") {
    reasons.push("Compliance risk is High");
  }

  return reasons;
}
