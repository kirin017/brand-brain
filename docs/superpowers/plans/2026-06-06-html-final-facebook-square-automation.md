# HTML Final Facebook Square Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a controlled HTML-to-PNG final render pipeline for BYT Facebook square posts using approved assets, deterministic Brand Brain generation, Brand Checker gates, visual QA, human approval state, and structured export.

**Architecture:** Add focused render modules under `lib/render/` and keep the existing Brand Brain generator intact. The pipeline creates a render payload from existing generated output, validates approved assets, selects one of three controlled Facebook square templates, renders HTML to PNG with Playwright, runs visual QA, writes archive files, and blocks final export until approval rules pass.

**Tech Stack:** Next.js App Router, TypeScript, Node fs/path APIs, Vitest for unit tests, Playwright for HTML-to-PNG rendering, existing `brand-data/` JSON and `templates/` markdown.

---

## Scope Check

The approved spec covers one subsystem: final HTML rendering for Facebook square posts. This plan does not implement Zalo publishing, Drive upload, Canva/Figma APIs, free-form image generation, or a custom backend. Those should get separate specs and plans.

## File Structure

Create or modify these files:

| Path | Responsibility |
| --- | --- |
| `package.json` | Add test/render scripts and dev dependencies needed for Vitest and Playwright. |
| `brand-data/assets.json` | Machine-readable asset index with approval statuses and allowed formats. |
| `schemas/asset.schema.json` | JSON schema for asset records. |
| `schemas/render-payload.schema.json` | JSON schema for render payloads. |
| `schemas/approval.schema.json` | JSON schema for approval records. |
| `lib/render/types.ts` | Shared render, asset, template, QA, archive, and approval types. |
| `lib/render/status.ts` | Status and gate helper functions. |
| `lib/render/assets.ts` | Asset loading, validation, and approved asset selection. |
| `lib/render/html.ts` | HTML escaping and document wrapper helpers. |
| `lib/render/facebook-square-templates.ts` | Three fixed 1080x1080 template definitions and HTML render functions. |
| `lib/render/render-planner.ts` | Convert Brand Brain generated output into a normalized render payload. |
| `lib/render/html-renderer.ts` | Render controlled HTML to PNG using Playwright. |
| `lib/render/visual-qa.ts` | Browser-based QA checks for dimensions, image load, overflow, and unresolved public text. |
| `lib/render/archive.ts` | Write render outputs to `outputs/facebook-square/YYYY-MM/...`. |
| `app/api/render/facebook-square/route.ts` | Internal render endpoint for request-to-render orchestration. |
| `app/api/render/facebook-square/approve/route.ts` | Internal approval endpoint to record approval and promote a rendered job to final export. |
| `lib/render/*.test.ts` | Unit tests for status, assets, templates, planner, QA gates, and archive behavior. |
| `docs/future-automation-plan.md` | Add a short note that HTML-to-image is the first final render path. |

## Task 1: Add Test Harness And Render Types

**Files:**
- Modify: `package.json`
- Create: `lib/render/types.ts`
- Create: `lib/render/status.ts`
- Test: `lib/render/status.test.ts`

- [ ] **Step 1: Add dev scripts and dependencies in `package.json`**

Replace the `scripts` object with:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "render:install": "playwright install chromium"
}
```

Add these dev dependencies:

```json
{
  "playwright": "^1.56.0",
  "vitest": "^3.2.0"
}
```

Run:

```powershell
npm.cmd install
```

Expected: packages install and `package-lock.json` updates.

- [ ] **Step 2: Write failing status tests**

Create `lib/render/status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canExportFinal,
  canRender,
  nextStatusAfterTextCheck,
  type RenderJobStatus
} from "./status";

describe("render status gates", () => {
  it("allows rendering only from ready_for_render", () => {
    expect(canRender("ready_for_render")).toBe(true);
    expect(canRender("blocked_for_compliance")).toBe(false);
    expect(canRender("blocked_for_missing_asset")).toBe(false);
  });

  it("allows final export only from approved", () => {
    expect(canExportFinal("approved")).toBe(true);
    expect(canExportFinal("rendered")).toBe(false);
    expect(canExportFinal("needs_human_approval")).toBe(false);
  });

  it("maps high compliance risk to blocked_for_compliance", () => {
    const status: RenderJobStatus = nextStatusAfterTextCheck({
      complianceRisk: "High",
      missingRequiredAssets: [],
      unresolvedFounderConfirmations: []
    });

    expect(status).toBe("blocked_for_compliance");
  });

  it("maps missing required assets to blocked_for_missing_asset", () => {
    const status = nextStatusAfterTextCheck({
      complianceRisk: "Low",
      missingRequiredAssets: ["main_image"],
      unresolvedFounderConfirmations: []
    });

    expect(status).toBe("blocked_for_missing_asset");
  });

  it("requires human approval when founder confirmations remain", () => {
    const status = nextStatusAfterTextCheck({
      complianceRisk: "Low",
      missingRequiredAssets: [],
      unresolvedFounderConfirmations: ["Logo chính thức"]
    });

    expect(status).toBe("needs_human_approval");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
npm.cmd run test -- lib/render/status.test.ts
```

Expected: fails because `lib/render/status.ts` does not exist.

- [ ] **Step 4: Create shared render types**

Create `lib/render/types.ts`:

```ts
import type { ComplianceRisk } from "../types";

export type RenderFormat = "facebook_square";

export type RenderTemplateId =
  | "product-focus"
  | "membership-focus"
  | "community-focus";

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
}

export interface BrandAssetIndex {
  metadata: {
    schema_version: string;
    language: "vi";
    status: string;
  };
  assets: BrandAsset[];
}

export interface RenderPayload {
  job_id: string;
  format: RenderFormat;
  template_id: RenderTemplateId;
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
```

- [ ] **Step 5: Implement status helpers**

Create `lib/render/status.ts`:

```ts
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
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm.cmd run test -- lib/render/status.test.ts
```

Expected: all status tests pass.

- [ ] **Step 7: Commit task 1**

```powershell
git add package.json package-lock.json lib/render/types.ts lib/render/status.ts lib/render/status.test.ts
git commit -m "feat: add render status types and tests"
```

## Task 2: Add Asset Index And Approved Asset Selection

**Files:**
- Create: `brand-data/assets.json`
- Create: `schemas/asset.schema.json`
- Create: `lib/render/assets.ts`
- Test: `lib/render/assets.test.ts`

- [ ] **Step 1: Write failing asset tests**

Create `lib/render/assets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  findApprovedAsset,
  listMissingRequiredAssets,
  validateAssetIndex
} from "./assets";
import type { BrandAssetIndex } from "./types";

const index: BrandAssetIndex = {
  metadata: {
    schema_version: "0.1.0",
    language: "vi",
    status: "draft"
  },
  assets: [
    {
      id: "logo_approved",
      type: "logo",
      path: "assets/logos/logoBYTconen.png",
      status: "approved",
      allowed_channels: ["Facebook"],
      allowed_formats: ["facebook_square"],
      usage_notes: "Approved test logo.",
      founder_confirmation_needed: false
    },
    {
      id: "product_unconfirmed",
      type: "product_photo",
      path: "assets/products/sample.png",
      status: "needs_founder_confirmation",
      allowed_channels: ["Facebook"],
      allowed_formats: ["facebook_square"],
      usage_notes: "Not final.",
      founder_confirmation_needed: true
    }
  ]
};

describe("asset selection", () => {
  it("validates an asset index shape", () => {
    expect(validateAssetIndex(index).valid).toBe(true);
  });

  it("returns approved assets only", () => {
    expect(findApprovedAsset(index, "logo_approved", "Facebook", "facebook_square")?.id).toBe("logo_approved");
    expect(findApprovedAsset(index, "product_unconfirmed", "Facebook", "facebook_square")).toBeNull();
  });

  it("lists missing required asset slots", () => {
    const missing = listMissingRequiredAssets(index, {
      requiredSlots: ["logo", "main_image"],
      assetIdsBySlot: {
        logo: "logo_approved",
        main_image: "product_unconfirmed"
      },
      channel: "Facebook",
      format: "facebook_square"
    });

    expect(missing).toEqual(["main_image"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd run test -- lib/render/assets.test.ts
```

Expected: fails because `lib/render/assets.ts` does not exist.

- [ ] **Step 3: Add asset index draft**

Create `brand-data/assets.json`:

```json
{
  "metadata": {
    "schema_version": "0.1.0",
    "language": "vi",
    "status": "draft",
    "notes": "Asset index nháp cho HTML final render. Logo, màu, font, QR, ảnh sản phẩm và ảnh nền cần founder xác nhận trước khi dùng public."
  },
  "assets": [
    {
      "id": "byt_logo_current_001",
      "type": "logo",
      "path": "assets/logos/logoBYTconen.png",
      "status": "needs_founder_confirmation",
      "allowed_channels": ["Facebook"],
      "allowed_formats": ["facebook_square"],
      "usage_notes": "Logo hiện có trong repo; cần founder xác nhận quyền dùng và quy tắc placement trước khi final.",
      "founder_confirmation_needed": true
    },
    {
      "id": "byt_logo_transparent_001",
      "type": "logo",
      "path": "assets/logos/Logo tách nền BYT.png",
      "status": "needs_founder_confirmation",
      "allowed_channels": ["Facebook"],
      "allowed_formats": ["facebook_square"],
      "usage_notes": "Logo tách nền hiện có trong repo; cần founder xác nhận trước khi final.",
      "founder_confirmation_needed": true
    }
  ]
}
```

- [ ] **Step 4: Add asset schema**

Create `schemas/asset.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://byt.local/schemas/asset.schema.json",
  "title": "BYT Asset Index",
  "type": "object",
  "required": ["metadata", "assets"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["schema_version", "language", "status"],
      "properties": {
        "schema_version": { "type": "string" },
        "language": { "const": "vi" },
        "status": { "type": "string" },
        "notes": { "type": "string" }
      },
      "additionalProperties": true
    },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "type",
          "path",
          "status",
          "allowed_channels",
          "allowed_formats",
          "usage_notes",
          "founder_confirmation_needed"
        ],
        "properties": {
          "id": { "type": "string" },
          "type": {
            "enum": [
              "logo",
              "product_photo",
              "background",
              "lifestyle_reference",
              "qr",
              "design_token"
            ]
          },
          "path": { "type": "string" },
          "status": {
            "enum": [
              "draft",
              "needs_founder_confirmation",
              "approved",
              "restricted",
              "do_not_use"
            ]
          },
          "allowed_channels": {
            "type": "array",
            "items": { "type": "string" }
          },
          "allowed_formats": {
            "type": "array",
            "items": { "enum": ["facebook_square"] }
          },
          "usage_notes": { "type": "string" },
          "founder_confirmation_needed": { "type": "boolean" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 5: Implement asset helpers**

Create `lib/render/assets.ts`:

```ts
import { promises as fs } from "fs";
import path from "path";
import type { BrandAsset, BrandAssetIndex, RenderFormat } from "./types";

export async function loadAssetIndex(): Promise<BrandAssetIndex> {
  const filePath = path.join(process.cwd(), "brand-data", "assets.json");
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content) as BrandAssetIndex;
  const validation = validateAssetIndex(parsed);

  if (!validation.valid) {
    throw new Error(`Invalid BYT asset index: ${validation.errors.join("; ")}`);
  }

  return parsed;
}

export function validateAssetIndex(index: BrandAssetIndex): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!index.metadata?.schema_version) errors.push("metadata.schema_version is required");
  if (index.metadata?.language !== "vi") errors.push("metadata.language must be vi");
  if (!Array.isArray(index.assets)) errors.push("assets must be an array");

  for (const asset of index.assets ?? []) {
    if (!asset.id) errors.push("asset.id is required");
    if (!asset.type) errors.push(`${asset.id}: asset.type is required`);
    if (!asset.path) errors.push(`${asset.id}: asset.path is required`);
    if (!asset.status) errors.push(`${asset.id}: asset.status is required`);
    if (!Array.isArray(asset.allowed_channels)) errors.push(`${asset.id}: allowed_channels must be an array`);
    if (!Array.isArray(asset.allowed_formats)) errors.push(`${asset.id}: allowed_formats must be an array`);
    if (typeof asset.founder_confirmation_needed !== "boolean") {
      errors.push(`${asset.id}: founder_confirmation_needed must be boolean`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function findApprovedAsset(
  index: BrandAssetIndex,
  assetId: string | undefined,
  channel: string,
  format: RenderFormat
): BrandAsset | null {
  if (!assetId) return null;

  const asset = index.assets.find((item) => item.id === assetId);
  if (!asset) return null;
  if (asset.status !== "approved") return null;
  if (asset.founder_confirmation_needed) return null;
  if (!asset.allowed_channels.includes(channel)) return null;
  if (!asset.allowed_formats.includes(format)) return null;

  return asset;
}

export function listMissingRequiredAssets(
  index: BrandAssetIndex,
  input: {
    requiredSlots: string[];
    assetIdsBySlot: Record<string, string | undefined>;
    channel: string;
    format: RenderFormat;
  }
): string[] {
  return input.requiredSlots.filter((slot) => {
    const asset = findApprovedAsset(
      index,
      input.assetIdsBySlot[slot],
      input.channel,
      input.format
    );
    return asset === null;
  });
}
```

- [ ] **Step 6: Run asset tests**

```powershell
npm.cmd run test -- lib/render/assets.test.ts
```

Expected: all asset tests pass.

- [ ] **Step 7: Commit task 2**

```powershell
git add brand-data/assets.json schemas/asset.schema.json lib/render/assets.ts lib/render/assets.test.ts
git commit -m "feat: add BYT render asset index"
```

## Task 3: Add Facebook Square Template Registry

**Files:**
- Create: `lib/render/html.ts`
- Create: `lib/render/facebook-square-templates.ts`
- Test: `lib/render/facebook-square-templates.test.ts`

- [ ] **Step 1: Write failing template tests**

Create `lib/render/facebook-square-templates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getFacebookSquareTemplate,
  listFacebookSquareTemplates,
  renderFacebookSquareHtml
} from "./facebook-square-templates";

describe("facebook square templates", () => {
  it("lists the three initial templates", () => {
    expect(listFacebookSquareTemplates().map((template) => template.id)).toEqual([
      "product-focus",
      "membership-focus",
      "community-focus"
    ]);
  });

  it("defines required asset slots for product template", () => {
    expect(getFacebookSquareTemplate("product-focus").requiredAssetSlots).toEqual([
      "main_image"
    ]);
  });

  it("escapes text when rendering HTML", () => {
    const html = renderFacebookSquareHtml({
      templateId: "community-focus",
      headline: "Ăn lành <script>",
      supportingCopy: "Một lựa chọn nhỏ & dễ duy trì.",
      cta: "Nhắn Bếp",
      brandName: "Bếp Yêu Thương",
      assets: {}
    });

    expect(html).toContain("Ăn lành &lt;script&gt;");
    expect(html).toContain("Một lựa chọn nhỏ &amp; dễ duy trì.");
    expect(html).not.toContain("<script>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd run test -- lib/render/facebook-square-templates.test.ts
```

Expected: fails because template files do not exist.

- [ ] **Step 3: Add HTML helpers**

Create `lib/render/html.ts`:

```ts
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function cssUrl(path: string): string {
  return `url("${path.replace(/"/g, "%22")}")`;
}

export function wrapHtmlDocument(input: { title: string; body: string; css: string }): string {
  return [
    "<!doctype html>",
    '<html lang="vi">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(input.title)}</title>`,
    "<style>",
    input.css,
    "</style>",
    "</head>",
    "<body>",
    input.body,
    "</body>",
    "</html>"
  ].join("\n");
}
```

- [ ] **Step 4: Add template registry**

Create `lib/render/facebook-square-templates.ts`:

```ts
import type { RenderTemplateId } from "./types";
import { cssUrl, escapeHtml, wrapHtmlDocument } from "./html";

export interface FacebookSquareTemplate {
  id: RenderTemplateId;
  label: string;
  requiredAssetSlots: Array<"logo" | "main_image" | "background" | "qr">;
  maxLengths: {
    headline: number;
    supportingCopy: number;
    cta: number;
  };
}

export interface FacebookSquareHtmlInput {
  templateId: RenderTemplateId;
  headline: string;
  supportingCopy: string;
  cta: string;
  brandName: string;
  assets: {
    logo?: string;
    mainImage?: string;
    background?: string;
  };
}

const templates: FacebookSquareTemplate[] = [
  {
    id: "product-focus",
    label: "Product Focus",
    requiredAssetSlots: ["main_image"],
    maxLengths: { headline: 54, supportingCopy: 110, cta: 36 }
  },
  {
    id: "membership-focus",
    label: "Membership Focus",
    requiredAssetSlots: ["main_image"],
    maxLengths: { headline: 58, supportingCopy: 120, cta: 38 }
  },
  {
    id: "community-focus",
    label: "Community Focus",
    requiredAssetSlots: [],
    maxLengths: { headline: 62, supportingCopy: 130, cta: 40 }
  }
];

export function listFacebookSquareTemplates(): FacebookSquareTemplate[] {
  return templates;
}

export function getFacebookSquareTemplate(templateId: RenderTemplateId): FacebookSquareTemplate {
  const template = templates.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown facebook square template: ${templateId}`);
  return template;
}

export function renderFacebookSquareHtml(input: FacebookSquareHtmlInput): string {
  const template = getFacebookSquareTemplate(input.templateId);
  const css = getBaseCss(input.assets.background);
  const body = [
    `<main class="frame frame-${template.id}">`,
    '<section class="brand-row">',
    input.assets.logo
      ? `<img class="brand-logo" src="${escapeHtml(input.assets.logo)}" alt="${escapeHtml(input.brandName)}" />`
      : `<div class="brand-text">${escapeHtml(input.brandName)}</div>`,
    "</section>",
    '<section class="content-grid">',
    input.assets.mainImage
      ? `<div class="image-panel"><img class="main-image" src="${escapeHtml(input.assets.mainImage)}" alt="" /></div>`
      : '<div class="image-panel image-panel-soft"><div class="image-copy">Ăn lành. Uống sạch. Sống yêu thương.</div></div>',
    '<div class="copy-panel">',
    `<h1 data-qa="headline">${escapeHtml(input.headline)}</h1>`,
    `<p data-qa="supporting-copy">${escapeHtml(input.supportingCopy)}</p>`,
    `<div class="cta" data-qa="cta">${escapeHtml(input.cta)}</div>`,
    "</div>",
    "</section>",
    "</main>"
  ].join("\n");

  return wrapHtmlDocument({
    title: `${template.label} Facebook Square`,
    css,
    body
  });
}

function getBaseCss(background?: string): string {
  const backgroundRule = background
    ? `background-image: linear-gradient(135deg, rgba(245,247,242,.94), rgba(255,253,249,.9)), ${cssUrl(background)};`
    : "background: #f5f7f2;";

  return `
    * { box-sizing: border-box; }
    html, body { width: 1080px; height: 1080px; margin: 0; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17211b; }
    .frame { width: 1080px; height: 1080px; padding: 64px; ${backgroundRule} background-size: cover; overflow: hidden; }
    .brand-row { height: 86px; display: flex; align-items: center; }
    .brand-logo { max-width: 220px; max-height: 72px; object-fit: contain; }
    .brand-text { font-size: 30px; font-weight: 800; color: #326b4f; }
    .content-grid { height: 826px; display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; }
    .image-panel { width: 100%; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; background: #fffdf9; border: 1px solid #dce4dc; display: flex; align-items: center; justify-content: center; }
    .image-panel-soft { background: #fffdf9; padding: 48px; }
    .image-copy { font-size: 38px; line-height: 1.18; font-weight: 800; color: #326b4f; }
    .main-image { width: 100%; height: 100%; object-fit: cover; }
    .copy-panel { min-width: 0; display: flex; flex-direction: column; gap: 28px; }
    h1 { margin: 0; font-size: 66px; line-height: 1.04; font-weight: 850; color: #17211b; }
    p { margin: 0; font-size: 31px; line-height: 1.35; color: #637066; }
    .cta { align-self: flex-start; border-radius: 8px; background: #326b4f; color: #ffffff; padding: 20px 26px; font-size: 28px; font-weight: 800; line-height: 1.1; }
    .frame-community-focus .content-grid { grid-template-columns: .9fr 1.1fr; }
    .frame-community-focus h1 { font-size: 62px; }
  `;
}
```

- [ ] **Step 5: Run template tests**

```powershell
npm.cmd run test -- lib/render/facebook-square-templates.test.ts
```

Expected: all template tests pass.

- [ ] **Step 6: Commit task 3**

```powershell
git add lib/render/html.ts lib/render/facebook-square-templates.ts lib/render/facebook-square-templates.test.ts
git commit -m "feat: add facebook square html templates"
```

## Task 4: Build Render Planner From Generated Output

**Files:**
- Create: `schemas/render-payload.schema.json`
- Create: `lib/render/render-planner.ts`
- Test: `lib/render/render-planner.test.ts`

- [ ] **Step 1: Write failing render planner tests**

Create `lib/render/render-planner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFacebookSquareRenderPlan } from "./render-planner";
import type { GeneratedOutput, GenerationInput } from "../types";
import type { BrandAssetIndex } from "./types";

const input: GenerationInput = {
  outputType: "facebook_post_brief",
  goal: "Tạo post Ban Mai",
  audience: "office_workers",
  productMembership: "Ban Mai Thức Giấc",
  campaign: "Ban Mai breakfast campaign",
  channel: "Facebook",
  format: "Facebook square post",
  offer: "",
  cta: "Nhắn Bếp để được gợi ý.",
  tone: "Ấm áp, thực tế, không phán xét",
  notes: "",
  riskSensitivity: "balanced"
};

const output: GeneratedOutput = {
  strategicAngle: [],
  copy: {
    headline: "Bữa sáng lành hơn cho ngày bận rộn",
    body: "Body",
    supportingCopy: ["Một lựa chọn gọn, dễ duy trì cho buổi sáng."]
  },
  designBrief: {
    campaignAngle: "Breakfast",
    audienceInsight: "Busy",
    mainMessage: "Bữa sáng lành hơn",
    visualConcept: "Natural",
    layoutStructure: [],
    colorDirection: "Cần founder xác nhận",
    typographyDirection: "Cần founder xác nhận",
    imageDirection: "Ảnh sản phẩm thật",
    iconIllustrationDirection: "Icon tối giản"
  },
  salesCommunityCta: "Nhắn Bếp để được gợi ý.",
  complianceCheck: {
    riskLevel: "Low",
    detectedRisks: [],
    saferRewrite: "Safe",
    humanApprovalRequired: false,
    recommendation: "Approved",
    checklist: []
  },
  brandCheckerScore: {
    brandFit: 9,
    visualFit: 8,
    voiceFit: 9,
    businessModelFit: 9,
    productAccuracy: 8,
    membershipAccuracy: 8,
    communityFit: 8,
    conversionClarity: 9,
    channelFit: 8,
    complianceRisk: "Low"
  },
  founderConfirmationNeeded: [],
  sourceFilesUsed: [],
  markdown: "Markdown"
};

const assets: BrandAssetIndex = {
  metadata: { schema_version: "0.1.0", language: "vi", status: "draft" },
  assets: []
};

describe("render planner", () => {
  it("blocks product-style membership output when required main image is missing", () => {
    const plan = createFacebookSquareRenderPlan(input, output, assets);
    expect(plan.payload.template_id).toBe("membership-focus");
    expect(plan.status).toBe("blocked_for_missing_asset");
    expect(plan.status_reasons).toContain("Missing approved asset for slot: main_image");
  });

  it("uses community-focus when output type is Zalo/community-like and no main image is required", () => {
    const communityPlan = createFacebookSquareRenderPlan(
      { ...input, outputType: "zalo_group_content", productMembership: "Khác / nhập trong ghi chú" },
      { ...output, founderConfirmationNeeded: [] },
      assets
    );
    expect(communityPlan.payload.template_id).toBe("community-focus");
    expect(communityPlan.status).toBe("ready_for_render");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd run test -- lib/render/render-planner.test.ts
```

Expected: fails because `render-planner.ts` does not exist.

- [ ] **Step 3: Add render payload schema**

Create `schemas/render-payload.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://byt.local/schemas/render-payload.schema.json",
  "title": "BYT Render Payload",
  "type": "object",
  "required": [
    "job_id",
    "format",
    "template_id",
    "campaign",
    "product_membership",
    "headline",
    "supporting_copy",
    "cta",
    "assets",
    "compliance",
    "founder_confirmation_needed"
  ],
  "properties": {
    "job_id": { "type": "string" },
    "format": { "const": "facebook_square" },
    "template_id": {
      "enum": ["product-focus", "membership-focus", "community-focus"]
    },
    "campaign": { "type": "string" },
    "product_membership": { "type": "string" },
    "headline": { "type": "string" },
    "supporting_copy": { "type": "string" },
    "cta": { "type": "string" },
    "assets": {
      "type": "object",
      "properties": {
        "logo": { "type": "string" },
        "main_image": { "type": "string" },
        "background": { "type": "string" },
        "qr": { "type": "string" }
      },
      "additionalProperties": false
    },
    "compliance": {
      "type": "object",
      "required": ["risk_level", "human_approval_required"],
      "properties": {
        "risk_level": { "enum": ["Low", "Medium", "High"] },
        "human_approval_required": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "founder_confirmation_needed": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 4: Implement render planner**

Create `lib/render/render-planner.ts`:

```ts
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
```

- [ ] **Step 5: Run planner tests**

```powershell
npm.cmd run test -- lib/render/render-planner.test.ts
```

Expected: all render planner tests pass.

- [ ] **Step 6: Commit task 4**

```powershell
git add schemas/render-payload.schema.json lib/render/render-planner.ts lib/render/render-planner.test.ts
git commit -m "feat: plan facebook square render payloads"
```

## Task 5: Render HTML To PNG And Run Visual QA

**Files:**
- Create: `lib/render/html-renderer.ts`
- Create: `lib/render/visual-qa.ts`
- Test: `lib/render/visual-qa.test.ts`

- [ ] **Step 1: Install Playwright Chromium**

Run:

```powershell
npm.cmd run render:install
```

Expected: Chromium browser is installed for Playwright.

- [ ] **Step 2: Write failing visual QA test**

Create `lib/render/visual-qa.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runStaticVisualQa } from "./visual-qa";

describe("static visual QA", () => {
  it("fails when public final HTML contains founder confirmation text", () => {
    const result = runStaticVisualQa({
      html: "<main>Cần founder xác nhận logo</main>",
      headline: "Headline",
      supportingCopy: "Supporting copy",
      cta: "CTA"
    });

    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.name === "no_founder_confirmation_text" && !check.passed)).toBe(true);
  });

  it("fails when headline exceeds safe length", () => {
    const result = runStaticVisualQa({
      html: "<main>Safe</main>",
      headline: "Một headline quá dài vượt quá giới hạn an toàn cho Facebook square post của BYT",
      supportingCopy: "Supporting copy",
      cta: "CTA"
    });

    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.name === "headline_length" && !check.passed)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
npm.cmd run test -- lib/render/visual-qa.test.ts
```

Expected: fails because `visual-qa.ts` does not exist.

- [ ] **Step 4: Implement static and browser QA**

Create `lib/render/visual-qa.ts`:

```ts
import type { Page } from "playwright";
import type { VisualQaResult } from "./types";

export function runStaticVisualQa(input: {
  html: string;
  headline: string;
  supportingCopy: string;
  cta: string;
}): VisualQaResult {
  const checks = [
    {
      name: "no_founder_confirmation_text",
      passed: !input.html.includes("Cần founder xác nhận"),
      details: "Final public HTML must not contain founder confirmation text."
    },
    {
      name: "headline_length",
      passed: input.headline.length <= 62,
      details: `Headline length is ${input.headline.length}; max is 62.`
    },
    {
      name: "supporting_copy_length",
      passed: input.supportingCopy.length <= 130,
      details: `Supporting copy length is ${input.supportingCopy.length}; max is 130.`
    },
    {
      name: "cta_length",
      passed: input.cta.length <= 40,
      details: `CTA length is ${input.cta.length}; max is 40.`
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export async function runBrowserVisualQa(page: Page): Promise<VisualQaResult> {
  const browserChecks = await page.evaluate(() => {
    const frame = document.querySelector(".frame");
    const imageElements = Array.from(document.images);
    const overflowElements = Array.from(document.querySelectorAll("[data-qa]")).filter((element) => {
      const htmlElement = element as HTMLElement;
      return htmlElement.scrollWidth > htmlElement.clientWidth || htmlElement.scrollHeight > htmlElement.clientHeight;
    });

    return {
      frameSize: frame ? { width: frame.clientWidth, height: frame.clientHeight } : null,
      imagesLoaded: imageElements.every((image) => image.complete && image.naturalWidth > 0),
      overflowCount: overflowElements.length
    };
  });

  const checks = [
    {
      name: "frame_size",
      passed: browserChecks.frameSize?.width === 1080 && browserChecks.frameSize?.height === 1080,
      details: `Frame size is ${JSON.stringify(browserChecks.frameSize)}; expected 1080x1080.`
    },
    {
      name: "images_loaded",
      passed: browserChecks.imagesLoaded,
      details: "All image elements must load before final export."
    },
    {
      name: "no_text_overflow",
      passed: browserChecks.overflowCount === 0,
      details: `Overflow element count is ${browserChecks.overflowCount}.`
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export function mergeQaResults(...results: VisualQaResult[]): VisualQaResult {
  const checks = results.flatMap((result) => result.checks);
  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}
```

- [ ] **Step 5: Implement Playwright renderer**

Create `lib/render/html-renderer.ts`:

```ts
import { chromium } from "playwright";
import { mergeQaResults, runBrowserVisualQa, runStaticVisualQa } from "./visual-qa";
import type { VisualQaResult } from "./types";

export interface HtmlRenderResult {
  png: Buffer;
  qa: VisualQaResult;
}

export async function renderHtmlToPng(input: {
  html: string;
  headline: string;
  supportingCopy: string;
  cta: string;
}): Promise<HtmlRenderResult> {
  const staticQa = runStaticVisualQa({
    html: input.html,
    headline: input.headline,
    supportingCopy: input.supportingCopy,
    cta: input.cta
  });

  if (!staticQa.passed) {
    return { png: Buffer.from([]), qa: staticQa };
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 1
    });
    await page.setContent(input.html, { waitUntil: "networkidle" });
    const browserQa = await runBrowserVisualQa(page);
    const qa = mergeQaResults(staticQa, browserQa);
    const png = qa.passed
      ? await page.screenshot({ type: "png", fullPage: false })
      : Buffer.from([]);

    return { png, qa };
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 6: Run visual QA tests**

```powershell
npm.cmd run test -- lib/render/visual-qa.test.ts
```

Expected: all static visual QA tests pass.

- [ ] **Step 7: Commit task 5**

```powershell
git add lib/render/html-renderer.ts lib/render/visual-qa.ts lib/render/visual-qa.test.ts
git commit -m "feat: add html render and visual qa"
```

## Task 6: Add Archive And Approval State

**Files:**
- Create: `schemas/approval.schema.json`
- Create: `lib/render/archive.ts`
- Test: `lib/render/archive.test.ts`

- [ ] **Step 1: Write failing archive tests**

Create `lib/render/archive.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { writeRenderArchive } from "./archive";
import type { ApprovalRecord, RenderPayload, VisualQaResult } from "./types";

const payload: RenderPayload = {
  job_id: "2026-06-06-facebook-ban-mai-001",
  format: "facebook_square",
  template_id: "community-focus",
  campaign: "Ban Mai breakfast campaign",
  product_membership: "Ban Mai Thức Giấc",
  headline: "Bữa sáng lành hơn",
  supporting_copy: "Một lựa chọn gọn hơn.",
  cta: "Nhắn Bếp",
  assets: {},
  compliance: { risk_level: "Low", human_approval_required: false },
  founder_confirmation_needed: []
};

const approval: ApprovalRecord = {
  job_id: payload.job_id,
  status: "needs_human_approval",
  approver: "",
  decided_at: "",
  notes: "Pending approval."
};

const qa: VisualQaResult = {
  passed: true,
  checks: [{ name: "frame_size", passed: true, details: "1080x1080" }]
};

describe("render archive", () => {
  it("writes all render archive files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "byt-render-"));
    try {
      const result = await writeRenderArchive({
        rootDir: root,
        payload,
        html: "<html></html>",
        png: Buffer.from("png"),
        brandCheckMarkdown: "# Brand Check",
        approval,
        qa
      });

      expect(await readFile(path.join(result.outputDir, "render.html"), "utf8")).toBe("<html></html>");
      expect(await readFile(path.join(result.outputDir, "brand-check.md"), "utf8")).toBe("# Brand Check");
      expect(JSON.parse(await readFile(path.join(result.outputDir, "metadata.json"), "utf8")).job_id).toBe(payload.job_id);
      expect(JSON.parse(await readFile(path.join(result.outputDir, "approval.json"), "utf8")).status).toBe("needs_human_approval");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd run test -- lib/render/archive.test.ts
```

Expected: fails because `archive.ts` does not exist.

- [ ] **Step 3: Add approval schema**

Create `schemas/approval.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://byt.local/schemas/approval.schema.json",
  "title": "BYT Render Approval",
  "type": "object",
  "required": ["job_id", "status", "approver", "decided_at", "notes"],
  "properties": {
    "job_id": { "type": "string" },
    "status": {
      "enum": ["needs_human_approval", "approved", "rejected"]
    },
    "approver": { "type": "string" },
    "decided_at": { "type": "string" },
    "notes": { "type": "string" }
  },
  "additionalProperties": false
}
```

- [ ] **Step 4: Implement archive writer**

Create `lib/render/archive.ts`:

```ts
import { promises as fs } from "fs";
import path from "path";
import type { ApprovalRecord, RenderPayload, VisualQaResult } from "./types";

export interface RenderArchiveResult {
  outputDir: string;
}

export async function writeRenderArchive(input: {
  rootDir?: string;
  payload: RenderPayload;
  html: string;
  png: Buffer;
  brandCheckMarkdown: string;
  approval: ApprovalRecord;
  qa: VisualQaResult;
}): Promise<RenderArchiveResult> {
  const root = input.rootDir ?? path.join(process.cwd(), "outputs");
  const month = input.payload.job_id.slice(0, 7);
  const outputDir = path.join(root, "facebook-square", month, input.payload.job_id);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "render.html"), input.html, "utf8");
  await fs.writeFile(path.join(outputDir, "rendered.png"), input.png);
  await fs.writeFile(path.join(outputDir, "brand-check.md"), input.brandCheckMarkdown, "utf8");
  await fs.writeFile(path.join(outputDir, "metadata.json"), JSON.stringify({
    ...input.payload,
    qa: input.qa,
    archived_at: new Date().toISOString()
  }, null, 2), "utf8");
  await fs.writeFile(path.join(outputDir, "approval.json"), JSON.stringify(input.approval, null, 2), "utf8");

  return { outputDir };
}

export async function promoteApprovedRenderToFinal(outputDir: string): Promise<void> {
  const approvalPath = path.join(outputDir, "approval.json");
  const approval = JSON.parse(await fs.readFile(approvalPath, "utf8")) as ApprovalRecord;

  if (approval.status !== "approved") {
    throw new Error(`Cannot create final.png because approval status is ${approval.status}`);
  }

  await fs.copyFile(path.join(outputDir, "rendered.png"), path.join(outputDir, "final.png"));
}
```

- [ ] **Step 5: Run archive tests**

```powershell
npm.cmd run test -- lib/render/archive.test.ts
```

Expected: all archive tests pass.

- [ ] **Step 6: Commit task 6**

```powershell
git add schemas/approval.schema.json lib/render/archive.ts lib/render/archive.test.ts
git commit -m "feat: archive rendered facebook square assets"
```

## Task 7: Add Internal Render And Approval Endpoints

**Files:**
- Create: `app/api/render/facebook-square/route.ts`
- Create: `app/api/render/facebook-square/approve/route.ts`

- [ ] **Step 1: Add render endpoint**

Create `app/api/render/facebook-square/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getBrandDataBundle } from "../../../../lib/brand-data";
import { generateBrandOutput } from "../../../../lib/generator";
import type { GenerationInput } from "../../../../lib/types";
import { loadAssetIndex } from "../../../../lib/render/assets";
import { writeRenderArchive } from "../../../../lib/render/archive";
import { renderHtmlToPng } from "../../../../lib/render/html-renderer";
import { renderFacebookSquareHtml } from "../../../../lib/render/facebook-square-templates";
import { createFacebookSquareRenderPlan } from "../../../../lib/render/render-planner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as GenerationInput;
  const data = await getBrandDataBundle();
  const assetIndex = await loadAssetIndex();
  const generated = generateBrandOutput(input, data);
  const plan = createFacebookSquareRenderPlan(input, generated, assetIndex);

  if (plan.status === "blocked_for_compliance" || plan.status === "blocked_for_missing_asset") {
    return NextResponse.json({
      status: plan.status,
      reasons: plan.status_reasons,
      payload: plan.payload,
      brand_check: generated.markdown
    }, { status: 422 });
  }

  const html = renderFacebookSquareHtml({
    templateId: plan.payload.template_id,
    headline: plan.payload.headline,
    supportingCopy: plan.payload.supporting_copy,
    cta: plan.payload.cta,
    brandName: "Bếp Yêu Thương",
    assets: {}
  });

  const rendered = await renderHtmlToPng({
    html,
    headline: plan.payload.headline,
    supportingCopy: plan.payload.supporting_copy,
    cta: plan.payload.cta
  });

  if (!rendered.qa.passed) {
    return NextResponse.json({
      status: "failed_visual_qa",
      qa: rendered.qa,
      payload: plan.payload
    }, { status: 422 });
  }

  const archive = await writeRenderArchive({
    payload: plan.payload,
    html,
    png: rendered.png,
    brandCheckMarkdown: generated.markdown,
    approval: {
      job_id: plan.payload.job_id,
      status: "needs_human_approval",
      approver: "",
      decided_at: "",
      notes: "Pending approval."
    },
    qa: rendered.qa
  });

  return NextResponse.json({
    status: "needs_human_approval",
    output_dir: archive.outputDir,
    payload: plan.payload,
    qa: rendered.qa
  });
}
```

- [ ] **Step 2: Add approval endpoint**

Create `app/api/render/facebook-square/approve/route.ts`:

```ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { promoteApprovedRenderToFinal } from "../../../../../lib/render/archive";
import type { ApprovalRecord } from "../../../../../lib/render/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as {
    output_dir: string;
    approver: string;
    notes: string;
    decision: "approved" | "rejected";
  };

  if (!input.output_dir.startsWith(path.join(process.cwd(), "outputs"))) {
    return NextResponse.json({ error: "output_dir must be inside outputs" }, { status: 400 });
  }

  const metadataPath = path.join(input.output_dir, "metadata.json");
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as { job_id: string };
  const approval: ApprovalRecord = {
    job_id: metadata.job_id,
    status: input.decision,
    approver: input.approver,
    decided_at: new Date().toISOString(),
    notes: input.notes
  };

  await fs.writeFile(path.join(input.output_dir, "approval.json"), JSON.stringify(approval, null, 2), "utf8");

  if (approval.status === "approved") {
    await promoteApprovedRenderToFinal(input.output_dir);
  }

  return NextResponse.json({
    status: approval.status,
    output_dir: input.output_dir,
    final_png: approval.status === "approved" ? path.join(input.output_dir, "final.png") : null
  });
}
```

- [ ] **Step 3: Run typecheck and build**

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands pass.

- [ ] **Step 4: Commit task 7**

```powershell
git add app/api/render/facebook-square/route.ts app/api/render/facebook-square/approve/route.ts
git commit -m "feat: add facebook square render endpoints"
```

## Task 8: Document HTML Final Render Path

**Files:**
- Modify: `docs/future-automation-plan.md`

- [ ] **Step 1: Add HTML render section**

Add this section after "## Luồng Tự Động Hóa Đề Xuất":

```markdown
## Phase Đầu Tiên Được Ưu Tiên: HTML-To-Image Cho Facebook Square

BYT sẽ ưu tiên HTML-to-image cho Facebook square post trước khi kết nối Canva/Figma/image generation API. Lý do:

- Agent viết HTML/CSS ổn định hơn so với tạo ảnh bằng prompt tự do.
- Text tiếng Việt, CTA, layout, badge và Brand Checker dễ kiểm soát hơn.
- Sản phẩm F&B cần ảnh thật hoặc asset đã duyệt, không nên để AI tự bịa sản phẩm/bao bì.
- HTML render có thể xuất `render.html`, `rendered.png`, `metadata.json`, `brand-check.md`, `approval.json` và sau duyệt là `final.png`.

Luồng ưu tiên:

```text
Brand Brain
→ Brand Brain Generator
→ Text Brand Checker
→ Template Selector
→ Approved Asset Selector
→ HTML Render
→ Visual QA
→ Human Approval
→ Export final.png
```

Quy tắc:

- Không có asset bắt buộc đã duyệt thì không xuất final.
- Compliance risk `High` thì không render final.
- Ảnh AI chỉ được dùng nếu đã qua duyệt và được ghi vào `brand-data/assets.json` với status `approved`.
```
```

- [ ] **Step 2: Run textual checks**

```powershell
rg "HTML-to-image|final.png|Approved Asset Selector" docs/future-automation-plan.md
```

Expected: the new section is found.

- [ ] **Step 3: Commit task 8**

```powershell
git add docs/future-automation-plan.md
git commit -m "docs: document html final render workflow"
```

## Task 9: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run full unit tests**

```powershell
npm.cmd run test
```

Expected: all Vitest tests pass.

- [ ] **Step 2: Run typecheck**

```powershell
npm.cmd run typecheck
```

Expected: `tsc --noEmit` exits 0.

- [ ] **Step 3: Run build**

```powershell
npm.cmd run build
```

Expected: Next.js compiles successfully and route table includes `/`.

- [ ] **Step 4: Run render install if Playwright complains**

```powershell
npm.cmd run render:install
```

Expected: Chromium installation completes. Run this only if Playwright reports missing browser binaries.

- [ ] **Step 5: Manual endpoint smoke test with blocked assets**

Start the dev server:

```powershell
npm.cmd run dev -- -H 0.0.0.0 -p 3001
```

Send a render request:

```powershell
$body = @{
  outputType = "facebook_post_brief"
  goal = "Tạo post Ban Mai"
  audience = "office_workers"
  productMembership = "Ban Mai Thức Giấc"
  campaign = "Ban Mai breakfast campaign"
  channel = "Facebook"
  format = "Facebook square post"
  offer = ""
  cta = "Nhắn Bếp để được gợi ý."
  tone = "Ấm áp, thực tế, không phán xét"
  notes = ""
  riskSensitivity = "balanced"
} | ConvertTo-Json

Invoke-WebRequest -Method Post -Uri http://localhost:3001/api/render/facebook-square -ContentType "application/json" -Body $body -UseBasicParsing
```

Expected while current assets are unapproved: HTTP 422 with `blocked_for_missing_asset` or `needs_human_approval` depending on selected template and asset status. The endpoint must not create `final.png` without approval.

- [ ] **Step 6: Commit verification notes if docs changed**

If verification requires a documentation adjustment, commit only that adjustment:

```powershell
git add <changed-doc-file>
git commit -m "docs: clarify facebook render verification"
```

If no files changed, do not create an empty commit.

## Self-Review

Spec coverage:

- Facebook square first format: Task 3, Task 4, Task 7.
- HTML render final path: Task 5, Task 6, Task 7.
- Approved asset library: Task 2, Task 4.
- Text Brand Checker and compliance blocking: Task 4, Task 7.
- Visual QA: Task 5.
- Human approval: Task 6, Task 7.
- Export PNG/HTML/JSON/Markdown/approval: Task 6.
- Zalo publish excluded: Task 8 documentation states the scope.

Type consistency:

- `RenderTemplateId` values match template registry and schema.
- `RenderJobStatus` values match spec.
- `RenderPayload` fields match schema.
- `ApprovalRecord` fields match schema and archive functions.

No implementation step depends on Zalo publishing, Canva, Figma, Drive, or image generation APIs.

