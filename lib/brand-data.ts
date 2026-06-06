import { promises as fs } from "fs";
import path from "path";
import type { BrandDataBundle, JsonRecord } from "./types";

const brandDataFiles = {
  brandBrain: "brand-brain.json",
  products: "products.json",
  memberships: "memberships.json",
  customerSegments: "customer-segments.json",
  channels: "channels.json",
  campaigns: "campaigns.json",
  voiceRules: "voice-rules.json",
  complianceRules: "compliance-rules.json",
  brandCheckRubric: "brand-check-rubric.json"
} as const;

const templateFiles = [
  "design-brief-template.md",
  "daily-design-request-template.md",
  "zalo-post-template.md",
  "sales-follow-up-template.md",
  "point-opening-pitch-template.md",
  "alliance-partner-invitation-template.md"
] as const;

async function readJson(fileName: string): Promise<JsonRecord> {
  const filePath = path.join(process.cwd(), "brand-data", fileName);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as JsonRecord;
}

async function readTemplate(fileName: string): Promise<[string, string]> {
  const filePath = path.join(process.cwd(), "templates", fileName);
  const content = await fs.readFile(filePath, "utf8");
  return [fileName, content];
}

export async function getBrandDataBundle(): Promise<BrandDataBundle> {
  const [
    brandBrain,
    products,
    memberships,
    customerSegments,
    channels,
    campaigns,
    voiceRules,
    complianceRules,
    brandCheckRubric,
    templateEntries
  ] = await Promise.all([
    readJson(brandDataFiles.brandBrain),
    readJson(brandDataFiles.products),
    readJson(brandDataFiles.memberships),
    readJson(brandDataFiles.customerSegments),
    readJson(brandDataFiles.channels),
    readJson(brandDataFiles.campaigns),
    readJson(brandDataFiles.voiceRules),
    readJson(brandDataFiles.complianceRules),
    readJson(brandDataFiles.brandCheckRubric),
    Promise.all(templateFiles.map(readTemplate))
  ]);

  return {
    brandBrain,
    products,
    memberships,
    customerSegments,
    channels,
    campaigns,
    voiceRules,
    complianceRules,
    brandCheckRubric,
    templates: Object.fromEntries(templateEntries)
  };
}

export const loadedSourceFiles = [
  ...Object.values(brandDataFiles).map((file) => `brand-data/${file}`),
  ...templateFiles.map((file) => `templates/${file}`)
];
