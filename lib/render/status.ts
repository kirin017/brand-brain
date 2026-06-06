import type { ComplianceRisk } from "../types";
import type { RenderJobStatus } from "./types";

export type { RenderJobStatus } from "./types";

export function canRender(status: RenderJobStatus): boolean {
  return status === "ready_for_render";
}

export function canExportFinal(status: RenderJobStatus): boolean {
  return status === "approved";
}

export function nextStatusAfterTextCheck(input: {
  complianceRisk: ComplianceRisk;
  missingRequiredAssets: string[];
  unresolvedFounderConfirmations: string[];
}): RenderJobStatus {
  if (input.complianceRisk === "High") {
    return "blocked_for_compliance";
  }

  if (input.missingRequiredAssets.length > 0) {
    return "blocked_for_missing_asset";
  }

  if (input.unresolvedFounderConfirmations.length > 0 || input.complianceRisk === "Medium") {
    return "needs_human_approval";
  }

  return "ready_for_render";
}
