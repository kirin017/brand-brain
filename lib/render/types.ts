import type { ComplianceRisk } from "../types";

export type RenderFormat = "facebook_square";

export type RenderTemplateId =
  | "ban-mai-breakfast"
  | "giot-lanh-membership"
  | "product-focus-drink"
  | "an-lanh-song-khoe-community"
  | "zalo-community"
  | "sale-ctv-recruitment"
  | "connected-point-posm"
  | "brand-alliance";

export type AssetStatus =
  | "draft"
  | "needs_founder_confirmation"
  | "approved"
  | "restricted"
  | "do_not_use";

export type AssetType =
  | "logo"
  | "product_photo"
  | "background"
  | "lifestyle_reference"
  | "qr"
  | "design_token";

export interface BrandAsset {
  id: string;
  type: AssetType;
  path: string;
  status: AssetStatus;
  allowed_channels: string[];
  allowed_formats: RenderFormat[];
  usage_notes: string;
  founder_confirmation_needed: boolean;
  product_tags?: string[];
  campaign_tags?: string[];
  visual_tags?: string[];
  best_for?: string[];
  avoid_for?: string[];
  approval_scope?: string;
}

export interface BrandAssetIndex {
  metadata: {
    schema_version: string;
    language: "vi";
    status: string;
    notes?: string;
  };
  assets: BrandAsset[];
}

export interface RenderPayload {
  job_id: string;
  format: RenderFormat;
  template_id: RenderTemplateId;
  template_variant: "A" | "B" | "C";
  campaign: string;
  product_membership: string;
  headline: string;
  supporting_copy: string;
  cta: string;
  assets: {
    logo?: string;
    main_image?: string;
    background?: string;
    qr?: string;
  };
  compliance: {
    risk_level: ComplianceRisk;
    human_approval_required: boolean;
  };
  founder_confirmation_needed: string[];
}

export type RenderJobStatus =
  | "draft"
  | "blocked_for_missing_asset"
  | "blocked_for_compliance"
  | "ready_for_render"
  | "rendered"
  | "failed_visual_qa"
  | "needs_human_approval"
  | "approved"
  | "exported"
  | "rejected";

export interface RenderPlan {
  payload: RenderPayload;
  status: RenderJobStatus;
  status_reasons: string[];
}

export interface VisualQaResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
}

export interface ApprovalRecord {
  job_id: string;
  status: "needs_human_approval" | "approved" | "rejected";
  approver: string;
  decided_at: string;
  notes: string;
}
