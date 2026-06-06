export type JsonRecord = Record<string, unknown>;

export type RiskSensitivity = "conservative" | "balanced" | "sales-oriented";

export type OutputType =
  | "daily_design_brief"
  | "facebook_post_brief"
  | "zalo_group_content"
  | "membership_campaign_content"
  | "sales_script"
  | "connected_point_pitch"
  | "brand_alliance_invitation"
  | "brand_checker_report";

export interface BrandDataBundle {
  brandBrain: JsonRecord;
  products: JsonRecord;
  memberships: JsonRecord;
  customerSegments: JsonRecord;
  channels: JsonRecord;
  campaigns: JsonRecord;
  voiceRules: JsonRecord;
  complianceRules: JsonRecord;
  brandCheckRubric: JsonRecord;
  templates: Record<string, string>;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormOptions {
  outputTypes: SelectOption[];
  audiences: SelectOption[];
  productMemberships: SelectOption[];
  campaigns: SelectOption[];
  channels: SelectOption[];
  formats: SelectOption[];
  tones: SelectOption[];
  riskSensitivities: SelectOption[];
}

export interface GenerationInput {
  outputType: OutputType;
  goal: string;
  audience: string;
  productMembership: string;
  campaign: string;
  channel: string;
  format: string;
  offer: string;
  cta: string;
  tone: string;
  notes: string;
  riskSensitivity: RiskSensitivity;
}

export type ComplianceRisk = "Low" | "Medium" | "High";

export interface ComplianceCheck {
  riskLevel: ComplianceRisk;
  detectedRisks: string[];
  saferRewrite: string;
  humanApprovalRequired: boolean;
  recommendation: "Approved" | "Revise" | "Reject";
  checklist: string[];
}

export interface BrandCheckerScores {
  brandFit: number;
  visualFit: number;
  voiceFit: number;
  businessModelFit: number;
  productAccuracy: number;
  membershipAccuracy: number;
  communityFit: number;
  conversionClarity: number;
  channelFit: number;
  complianceRisk: ComplianceRisk;
}

export interface GeneratedOutput {
  strategicAngle: string[];
  copy: {
    headline: string;
    body: string;
    supportingCopy: string[];
  };
  designBrief: {
    campaignAngle: string;
    audienceInsight: string;
    mainMessage: string;
    visualConcept: string;
    layoutStructure: string[];
    colorDirection: string;
    typographyDirection: string;
    imageDirection: string;
    iconIllustrationDirection: string;
  };
  salesCommunityCta: string;
  complianceCheck: ComplianceCheck;
  brandCheckerScore: BrandCheckerScores;
  founderConfirmationNeeded: string[];
  sourceFilesUsed: string[];
  markdown: string;
}
