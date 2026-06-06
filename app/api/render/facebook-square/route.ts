import { getBrandDataBundle } from "../../../../lib/brand-data";
import { generateBrandOutput } from "../../../../lib/generator";
import type { BrandDataBundle, GenerationInput } from "../../../../lib/types";
import { loadAssetIndex } from "../../../../lib/render/assets";
import { writeRenderArchive } from "../../../../lib/render/archive";
import { getFacebookSquareTemplate, renderFacebookSquareHtml } from "../../../../lib/render/facebook-square-templates";
import { renderHtmlToPng } from "../../../../lib/render/html-renderer";
import { createFacebookSquareRenderPlan } from "../../../../lib/render/render-planner";
import type { RenderPlan } from "../../../../lib/render/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let input: GenerationInput;

  try {
    input = await request.json() as GenerationInput;
  } catch {
    return Response.json(
      { status: "invalid_request", error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  try {
    const data = await getBrandDataBundle();
    const assetIndex = await loadAssetIndex();
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
    const html = renderFacebookSquareHtml({
      templateId: plan.payload.template_id,
      headline: plan.payload.headline,
      supportingCopy: plan.payload.supporting_copy,
      cta: plan.payload.cta,
      brandName: getBrandName(data),
      assets: plan.payload.assets
    });
    const rendered = await renderHtmlToPng({
      html,
      headline: plan.payload.headline,
      supportingCopy: plan.payload.supporting_copy,
      cta: plan.payload.cta,
      maxLengths: template.maxLengths
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
      output_dir: archive.outputDir,
      payload: plan.payload,
      qa: rendered.qa
    });
  } catch (error) {
    return Response.json(
      { status: "internal_error", error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

function isBlockedPlan(plan: RenderPlan): boolean {
  return plan.status === "blocked_for_compliance" || plan.status === "blocked_for_missing_asset";
}

function getBrandName(data: BrandDataBundle): string {
  return typeof data.brandBrain.brand_name === "string" && data.brandBrain.brand_name.trim().length > 0
    ? data.brandBrain.brand_name
    : "Bếp Yêu Thương";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
