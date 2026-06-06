import path from "path";
import { pathToFileURL } from "url";
import { getBrandDataBundle } from "../../../../lib/brand-data";
import { generateBrandOutput } from "../../../../lib/generator";
import type { BrandDataBundle, GenerationInput, OutputType, RiskSensitivity } from "../../../../lib/types";
import { loadAssetIndex } from "../../../../lib/render/assets";
import { RenderArchiveExistsError, writeRenderArchive } from "../../../../lib/render/archive";
import {
  getFacebookSquareTemplate,
  renderFacebookSquareHtml,
  type FacebookSquareHtmlInput
} from "../../../../lib/render/facebook-square-templates";
import { renderHtmlToPng } from "../../../../lib/render/html-renderer";
import { createFacebookSquareRenderPlan } from "../../../../lib/render/render-planner";
import type { BrandAssetIndex, RenderPlan } from "../../../../lib/render/types";
import { toRelativeOutputPath } from "./route-helpers";

export const runtime = "nodejs";

const outputTypes = [
  "daily_design_brief",
  "facebook_post_brief",
  "zalo_group_content",
  "membership_campaign_content",
  "sales_script",
  "connected_point_pitch",
  "brand_alliance_invitation",
  "brand_checker_report"
] as const satisfies readonly OutputType[];

const riskSensitivities = [
  "conservative",
  "balanced",
  "sales-oriented"
] as const satisfies readonly RiskSensitivity[];

const stringFields = [
  "goal",
  "audience",
  "productMembership",
  "campaign",
  "channel",
  "format",
  "offer",
  "cta",
  "tone",
  "notes"
] as const;

const templateAssetSlots = ["logo", "main_image", "background"] as const;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "invalid_request", error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const validation = validateGenerationInput(body);
  if (!validation.valid) {
    return Response.json(
      { status: "invalid_request", error: validation.error },
      { status: 400 }
    );
  }

  try {
    const data = await getBrandDataBundle();
    const assetIndex = await loadAssetIndex();
    const input = validation.input;
    const output = generateBrandOutput(input, data);
    const plan = createFacebookSquareRenderPlan(input, output, assetIndex);

    if (isBlockedPlan(plan)) {
      return Response.json(
        {
          status: plan.status,
          reasons: plan.status_reasons,
          payload: plan.payload,
          brand_check: output.markdown
        },
        { status: 422 }
      );
    }

    const template = getFacebookSquareTemplate(plan.payload.template_id);
    const templateAssets = resolveTemplateAssetUrls(assetIndex, plan.payload.assets);
    const html = renderFacebookSquareHtml({
      templateId: plan.payload.template_id,
      headline: plan.payload.headline,
      supportingCopy: plan.payload.supporting_copy,
      cta: plan.payload.cta,
      brandName: getBrandName(data),
      assets: templateAssets
    });
    const rendered = await renderHtmlToPng({
      html,
      headline: plan.payload.headline,
      supportingCopy: plan.payload.supporting_copy,
      cta: plan.payload.cta,
      maxLengths: template.maxLengths,
      requiredBackgroundUrls: templateAssets.background ? [templateAssets.background] : undefined
    });

    if (!rendered.qa.passed) {
      return Response.json(
        {
          status: "failed_visual_qa",
          qa: rendered.qa,
          payload: plan.payload
        },
        { status: 422 }
      );
    }

    const archive = await writeRenderArchive({
      payload: plan.payload,
      html,
      png: rendered.png,
      brandCheckMarkdown: output.markdown,
      approval: {
        job_id: plan.payload.job_id,
        status: "needs_human_approval",
        approver: "",
        decided_at: "",
        notes: "Pending human approval."
      },
      qa: rendered.qa
    });

    return Response.json({
      status: "needs_human_approval",
      job_id: plan.payload.job_id,
      archive_path: toRelativeOutputPath(archive.outputDir),
      payload: plan.payload,
      qa: rendered.qa
    });
  } catch (error) {
    if (error instanceof RenderArchiveExistsError) {
      return Response.json(
        {
          status: "archive_exists",
          error: "Render archive already exists for this job_id.",
          archive_path: toRelativeOutputPath(error.outputDir)
        },
        { status: 409 }
      );
    }

    if (error instanceof AssetResolutionError) {
      return Response.json(
        { status: "invalid_asset", error: error.message },
        { status: 422 }
      );
    }

    return Response.json(
      { status: "internal_error", error: "Internal render error." },
      { status: 500 }
    );
  }
}

function isBlockedPlan(plan: RenderPlan): boolean {
  return plan.status === "blocked_for_compliance" || plan.status === "blocked_for_missing_asset";
}

function validateGenerationInput(body: unknown):
  | { valid: true; input: GenerationInput }
  | { valid: false; error: string } {
  if (!isRecord(body)) {
    return { valid: false, error: "Request body must be an object." };
  }

  const outputType = body.outputType;
  if (!isOutputType(outputType)) {
    return { valid: false, error: `outputType must be one of ${outputTypes.join(", ")}.` };
  }

  const riskSensitivity = body.riskSensitivity;
  if (!isRiskSensitivity(riskSensitivity)) {
    return { valid: false, error: `riskSensitivity must be one of ${riskSensitivities.join(", ")}.` };
  }

  const stringValues = {} as Record<(typeof stringFields)[number], string>;
  for (const field of stringFields) {
    const value = body[field];
    if (typeof value !== "string") {
      return { valid: false, error: `${field} must be a string.` };
    }
    stringValues[field] = value;
  }

  return {
    valid: true,
    input: {
      outputType,
      goal: stringValues.goal,
      audience: stringValues.audience,
      productMembership: stringValues.productMembership,
      campaign: stringValues.campaign,
      channel: stringValues.channel,
      format: stringValues.format,
      offer: stringValues.offer,
      cta: stringValues.cta,
      tone: stringValues.tone,
      notes: stringValues.notes,
      riskSensitivity
    }
  };
}

function resolveTemplateAssetUrls(
  assetIndex: BrandAssetIndex,
  assets: RenderPlan["payload"]["assets"]
): FacebookSquareHtmlInput["assets"] {
  const resolvedAssets: FacebookSquareHtmlInput["assets"] = {};

  for (const slot of templateAssetSlots) {
    const assetId = assets[slot];
    if (!assetId) continue;

    resolvedAssets[slot] = resolveAssetFileUrl(assetIndex, assetId);
  }

  return resolvedAssets;
}

function resolveAssetFileUrl(assetIndex: BrandAssetIndex, assetId: string): string {
  const asset = assetIndex.assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new AssetResolutionError(`Unknown asset id in render payload: ${assetId}`);
  }

  const repoRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd());
  const assetPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), asset.path);
  const relativeAssetPath = path.relative(repoRoot, assetPath);

  if (relativeAssetPath.startsWith("..") || path.isAbsolute(relativeAssetPath)) {
    throw new AssetResolutionError(`Asset path escapes repository root for asset id: ${assetId}`);
  }

  return pathToFileURL(assetPath).toString();
}

function getBrandName(data: BrandDataBundle): string {
  return typeof data.brandBrain.brand_name === "string" && data.brandBrain.brand_name.trim().length > 0
    ? data.brandBrain.brand_name
    : "Bếp Yêu Thương";
}

function isOutputType(value: unknown): value is OutputType {
  return typeof value === "string" && outputTypes.includes(value as OutputType);
}

function isRiskSensitivity(value: unknown): value is RiskSensitivity {
  return typeof value === "string" && riskSensitivities.includes(value as RiskSensitivity);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class AssetResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetResolutionError";
  }
}
