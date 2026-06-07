# BYT HTML Template Design System Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 HTML Template Design System so BYT can render brand-consistent Facebook square drafts with context-aware templates, tag-matched real assets, publication-ready copy, Visual QA, and human approval before `final.png`.

**Architecture:** Keep the existing Next.js API and render pipeline, but split the logic into focused units: asset validation, tag-based asset matching, template registry/rendering, render copy extraction, render planning, and asset URL resolution. The render endpoint remains local-data-first and produces archives under `outputs/`.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Playwright Chromium, local JSON files in `brand-data/`, HTML/CSS screenshot rendering.

---

## File Structure

- Modify `lib/render/types.ts`
  - Add Phase 1 template IDs.
  - Add structured optional asset metadata fields.
  - Add `template_variant` to `RenderPayload`.
- Modify `lib/render/assets.ts`
  - Validate optional asset metadata arrays.
  - Keep existing JSON files valid when new fields are absent.
- Create `lib/render/asset-matcher.ts`
  - Select approved assets by slot, type, channel, format, and required tags.
  - Prevent fallback to unrelated approved assets.
- Modify `lib/render/render-planner.ts`
  - Use context-aware template selection.
  - Use tag-based asset matching.
  - Use publication-ready render copy.
- Create `lib/render/render-copy.ts`
  - Convert `GeneratedOutput` into image-safe headline, supporting copy, and CTA.
  - Remove internal lines such as `Tone: ...`.
- Modify `lib/render/facebook-square-templates.ts`
  - Replace generic three-template registry with Phase 1 context templates.
  - Keep one HTML renderer with template-specific layout classes.
- Create `lib/render/asset-resolver.ts`
  - Resolve local approved asset paths into data URLs for Playwright rendering.
  - Keep path traversal and unsupported file type protection.
- Modify `app/api/render/facebook-square/route.ts`
  - Import asset resolver instead of doing private route-level path resolution.
- Update tests:
  - `lib/render/assets.test.ts`
  - `lib/render/asset-matcher.test.ts`
  - `lib/render/render-planner.test.ts`
  - `lib/render/render-copy.test.ts`
  - `lib/render/facebook-square-templates.test.ts`
  - `lib/render/asset-resolver.test.ts`
- Update `brand-data/assets.json`
  - Add structured tags for the approved BYT logo and Ban Mai breakfast asset.
  - Keep unconfirmed assets blocked.

---

### Task 1: Extend Render Types And Asset Validation

**Files:**
- Modify: `lib/render/types.ts`
- Modify: `lib/render/assets.ts`
- Test: `lib/render/assets.test.ts`

- [ ] **Step 1: Add failing asset metadata validation tests**

Add these tests to `lib/render/assets.test.ts`:

```ts
it("accepts optional asset tag metadata fields", () => {
  const index = createAssetIndex([
    {
      ...createAsset("ban-mai-yen-mach"),
      product_tags: ["ban_mai", "yen_mach", "breakfast"],
      campaign_tags: ["ban_mai_breakfast"],
      visual_tags: ["warm", "natural", "product_clear"],
      best_for: ["Ban Mai breakfast Facebook square"],
      avoid_for: ["detox product post"],
      approval_scope: "internal_test"
    }
  ]);

  expect(validateAssetIndex(index)).toEqual({ valid: true, errors: [] });
});

it("rejects asset tag metadata that is not an array of strings", () => {
  const index = createAssetIndex([
    {
      ...createAsset("bad-tags"),
      product_tags: ["ban_mai", 123],
      campaign_tags: "ban_mai_breakfast",
      visual_tags: [null],
      best_for: [false],
      avoid_for: [{}],
      approval_scope: 42
    }
  ] as unknown as BrandAsset[]);

  const validation = validateAssetIndex(index);

  expect(validation.valid).toBe(false);
  expect(validation.errors).toContain("bad-tags: product_tags must contain strings only");
  expect(validation.errors).toContain("bad-tags: campaign_tags must be an array");
  expect(validation.errors).toContain("bad-tags: visual_tags must contain strings only");
  expect(validation.errors).toContain("bad-tags: best_for must contain strings only");
  expect(validation.errors).toContain("bad-tags: avoid_for must contain strings only");
  expect(validation.errors).toContain("bad-tags: approval_scope must be a string");
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run:

```powershell
npm.cmd test -- lib/render/assets.test.ts
```

Expected: FAIL because `validateAssetIndex` rejects the new fields as unsupported.

- [ ] **Step 3: Extend `BrandAsset` and `RenderTemplateId`**

In `lib/render/types.ts`, replace `RenderTemplateId` with:

```ts
export type RenderTemplateId =
  | "ban-mai-breakfast"
  | "giot-lanh-membership"
  | "product-focus-drink"
  | "an-lanh-song-khoe-community"
  | "zalo-community"
  | "sale-ctv-recruitment"
  | "connected-point-posm"
  | "brand-alliance";
```

Add these optional fields to `BrandAsset`:

```ts
  product_tags?: string[];
  campaign_tags?: string[];
  visual_tags?: string[];
  best_for?: string[];
  avoid_for?: string[];
  approval_scope?: string;
```

Add `template_variant` to `RenderPayload`:

```ts
  template_variant: "A" | "B" | "C";
```

- [ ] **Step 4: Extend validation in `lib/render/assets.ts`**

Add the new fields to `allowedAssetKeys`:

```ts
  "product_tags",
  "campaign_tags",
  "visual_tags",
  "best_for",
  "avoid_for",
  "approval_scope"
```

Add this helper near `isAllowedValue`:

```ts
function validateOptionalStringArray(
  asset: Record<string, unknown>,
  assetId: string,
  fieldName: string,
  errors: string[]
): void {
  const value = asset[fieldName];
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${assetId}: ${fieldName} must be an array`);
    return;
  }
  if (!value.every((item) => typeof item === "string")) {
    errors.push(`${assetId}: ${fieldName} must contain strings only`);
  }
}
```

Inside the asset loop, after `founder_confirmation_needed` validation, add:

```ts
    for (const fieldName of ["product_tags", "campaign_tags", "visual_tags", "best_for", "avoid_for"]) {
      validateOptionalStringArray(asset, assetId, fieldName, errors);
    }
    if (asset.approval_scope !== undefined && typeof asset.approval_scope !== "string") {
      errors.push(`${assetId}: approval_scope must be a string`);
    }
```

- [ ] **Step 5: Run the targeted test to verify it passes**

Run:

```powershell
npm.cmd test -- lib/render/assets.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/render/types.ts lib/render/assets.ts lib/render/assets.test.ts
git commit -m "feat: extend render asset metadata"
```

---

### Task 2: Add Tag-Based Asset Matcher

**Files:**
- Create: `lib/render/asset-matcher.ts`
- Test: `lib/render/asset-matcher.test.ts`

- [ ] **Step 1: Write the failing matcher tests**

Create `lib/render/asset-matcher.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { chooseApprovedAssetIdForSlot, normalizeRenderTag } from "./asset-matcher";
import type { BrandAsset, BrandAssetIndex } from "./types";

const index: BrandAssetIndex = {
  metadata: { schema_version: "0.1.0", language: "vi", status: "draft" },
  assets: [
    asset({
      id: "ban-mai-yen-mach",
      type: "product_photo",
      status: "approved",
      founder_confirmation_needed: false,
      product_tags: ["ban_mai", "yen_mach", "breakfast"],
      campaign_tags: ["ban_mai_breakfast"],
      visual_tags: ["warm", "natural", "product_clear"]
    }),
    asset({
      id: "detox-basic",
      type: "product_photo",
      status: "approved",
      founder_confirmation_needed: false,
      product_tags: ["detox", "drink"],
      campaign_tags: ["product_focus_drink"],
      visual_tags: ["warm", "natural", "product_clear"]
    }),
    asset({
      id: "approved-logo",
      type: "logo",
      status: "approved",
      founder_confirmation_needed: false
    }),
    asset({
      id: "unconfirmed-breakfast",
      type: "product_photo",
      status: "needs_founder_confirmation",
      founder_confirmation_needed: true,
      product_tags: ["ban_mai", "breakfast"],
      campaign_tags: ["ban_mai_breakfast"]
    })
  ]
};

describe("normalizeRenderTag", () => {
  it("normalizes Vietnamese and spacing to stable tags", () => {
    expect(normalizeRenderTag("Ăn lành - Sống khỏe")).toBe("an_lanh_song_khoe");
    expect(normalizeRenderTag("Ban Mai Thức Giấc")).toBe("ban_mai_thuc_giac");
  });
});

describe("chooseApprovedAssetIdForSlot", () => {
  it("chooses an approved product photo with all required tags", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "main_image",
      type: "product_photo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: ["ban_mai", "breakfast"]
    })).toBe("ban-mai-yen-mach");
  });

  it("does not fallback to an unrelated approved product photo", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "main_image",
      type: "product_photo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: ["giot_lanh"]
    })).toBeUndefined();
  });

  it("allows logo selection without product tags", () => {
    expect(chooseApprovedAssetIdForSlot(index, {
      slot: "logo",
      type: "logo",
      channel: "Facebook",
      format: "facebook_square",
      requiredTags: []
    })).toBe("approved-logo");
  });
});

function asset(overrides: Partial<BrandAsset> & Pick<BrandAsset, "id" | "type">): BrandAsset {
  return {
    id: overrides.id,
    type: overrides.type,
    path: `assets/${overrides.id}.png`,
    status: overrides.status ?? "approved",
    allowed_channels: overrides.allowed_channels ?? ["Facebook"],
    allowed_formats: overrides.allowed_formats ?? ["facebook_square"],
    usage_notes: overrides.usage_notes ?? "Test asset.",
    founder_confirmation_needed: overrides.founder_confirmation_needed ?? false,
    product_tags: overrides.product_tags,
    campaign_tags: overrides.campaign_tags,
    visual_tags: overrides.visual_tags,
    best_for: overrides.best_for,
    avoid_for: overrides.avoid_for,
    approval_scope: overrides.approval_scope
  };
}
```

- [ ] **Step 2: Run the matcher test to verify it fails**

Run:

```powershell
npm.cmd test -- lib/render/asset-matcher.test.ts
```

Expected: FAIL because `asset-matcher.ts` does not exist.

- [ ] **Step 3: Create `lib/render/asset-matcher.ts`**

Create the file:

```ts
import { findApprovedAsset } from "./assets";
import type { AssetType, BrandAsset, BrandAssetIndex, RenderFormat } from "./types";

export interface AssetMatchRequest {
  slot: "logo" | "main_image" | "background" | "qr";
  type: AssetType;
  channel: string;
  format: RenderFormat;
  requiredTags: string[];
}

export function chooseApprovedAssetIdForSlot(
  index: BrandAssetIndex,
  request: AssetMatchRequest
): string | undefined {
  const requiredTags = request.requiredTags.map(normalizeRenderTag).filter(Boolean);
  const candidates = index.assets.filter((asset) => {
    if (asset.type !== request.type) return false;
    if (!findApprovedAsset(index, asset.id, request.channel, request.format)) return false;
    if (requiredTags.length === 0) return true;
    return assetHasAllTags(asset, requiredTags);
  });

  return candidates[0]?.id;
}

export function assetHasAllTags(asset: BrandAsset, requiredTags: string[]): boolean {
  const tags = collectAssetTags(asset);
  return requiredTags.every((tag) => tags.has(normalizeRenderTag(tag)));
}

export function collectAssetTags(asset: BrandAsset): Set<string> {
  return new Set([
    ...(asset.product_tags ?? []),
    ...(asset.campaign_tags ?? []),
    ...(asset.visual_tags ?? [])
  ].map(normalizeRenderTag).filter(Boolean));
}

export function normalizeRenderTag(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
```

- [ ] **Step 4: Run the matcher test to verify it passes**

Run:

```powershell
npm.cmd test -- lib/render/asset-matcher.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/render/asset-matcher.ts lib/render/asset-matcher.test.ts
git commit -m "feat: add tag based render asset matcher"
```

---

### Task 3: Add Phase 1 Template Registry

**Files:**
- Modify: `lib/render/facebook-square-templates.ts`
- Test: `lib/render/facebook-square-templates.test.ts`

- [ ] **Step 1: Replace template registry tests**

Update `lib/render/facebook-square-templates.test.ts` so the template list test expects Phase 1 IDs:

```ts
it("lists the Phase 1 BYT context templates", () => {
  expect(listFacebookSquareTemplates().map((template) => template.id)).toEqual([
    "ban-mai-breakfast",
    "giot-lanh-membership",
    "product-focus-drink",
    "an-lanh-song-khoe-community",
    "zalo-community",
    "sale-ctv-recruitment",
    "connected-point-posm",
    "brand-alliance"
  ]);
});
```

Replace the required asset slots test with:

```ts
it("requires real product images only for product-led templates", () => {
  expect(getFacebookSquareTemplate("ban-mai-breakfast").requiredAssetSlots).toEqual(["main_image"]);
  expect(getFacebookSquareTemplate("product-focus-drink").requiredAssetSlots).toEqual(["main_image"]);
  expect(getFacebookSquareTemplate("giot-lanh-membership").requiredAssetSlots).toEqual([]);
  expect(getFacebookSquareTemplate("an-lanh-song-khoe-community").requiredAssetSlots).toEqual([]);
  expect(getFacebookSquareTemplate("zalo-community").requiredAssetSlots).toEqual([]);
});
```

Add a layout class test:

```ts
it("renders template-specific frame classes", () => {
  const html = renderFacebookSquareHtml({
    templateId: "an-lanh-song-khoe-community",
    templateVariant: "A",
    headline: "Ăn lành bắt đầu từ một bữa nhỏ",
    supportingCopy: "Một gợi ý dễ làm cho ngày bận rộn.",
    cta: "Lưu lại cho hôm nay",
    brandName: "Bếp Yêu Thương",
    assets: {}
  });

  expect(html).toContain("frame-an-lanh-song-khoe-community");
  expect(html).toContain("variant-a");
});
```

- [ ] **Step 2: Run template tests to verify they fail**

Run:

```powershell
npm.cmd test -- lib/render/facebook-square-templates.test.ts
```

Expected: FAIL because the registry still has old template IDs and `templateVariant` is missing from the input type.

- [ ] **Step 3: Update `FacebookSquareTemplate` and input type**

In `lib/render/facebook-square-templates.ts`, add these fields:

```ts
  layout: "split-product" | "membership" | "community" | "recruitment" | "point" | "alliance";
  visualTone: string;
```

Add `templateVariant` to `FacebookSquareHtmlInput`:

```ts
  templateVariant: "A" | "B" | "C";
```

- [ ] **Step 4: Replace the template array**

Replace `const templates` with:

```ts
const templates: FacebookSquareTemplate[] = [
  {
    id: "ban-mai-breakfast",
    label: "Ban Mai Breakfast",
    requiredAssetSlots: ["main_image"],
    maxLengths: { headline: 54, supportingCopy: 105, cta: 36 },
    layout: "split-product",
    visualTone: "warm breakfast, natural morning, product clear"
  },
  {
    id: "giot-lanh-membership",
    label: "Giot Lanh Membership",
    requiredAssetSlots: [],
    maxLengths: { headline: 58, supportingCopy: 120, cta: 38 },
    layout: "membership",
    visualTone: "warm membership, caring, community trust"
  },
  {
    id: "product-focus-drink",
    label: "Product Focus Drink",
    requiredAssetSlots: ["main_image"],
    maxLengths: { headline: 52, supportingCopy: 100, cta: 36 },
    layout: "split-product",
    visualTone: "product clarity, natural ingredients, no medical style"
  },
  {
    id: "an-lanh-song-khoe-community",
    label: "An Lanh Song Khoe Community",
    requiredAssetSlots: [],
    maxLengths: { headline: 60, supportingCopy: 125, cta: 38 },
    layout: "community",
    visualTone: "healthy living community, gentle, non-judgmental"
  },
  {
    id: "zalo-community",
    label: "Zalo Community",
    requiredAssetSlots: [],
    maxLengths: { headline: 58, supportingCopy: 120, cta: 36 },
    layout: "community",
    visualTone: "Zalo group, friendly, trust building"
  },
  {
    id: "sale-ctv-recruitment",
    label: "Sale CTV Recruitment",
    requiredAssetSlots: [],
    maxLengths: { headline: 56, supportingCopy: 110, cta: 34 },
    layout: "recruitment",
    visualTone: "practical opportunity, no income overpromise"
  },
  {
    id: "connected-point-posm",
    label: "Connected Point POSM",
    requiredAssetSlots: [],
    maxLengths: { headline: 52, supportingCopy: 100, cta: 32 },
    layout: "point",
    visualTone: "local touchpoint, QR ready, clear CTA"
  },
  {
    id: "brand-alliance",
    label: "Brand Alliance",
    requiredAssetSlots: [],
    maxLengths: { headline: 56, supportingCopy: 110, cta: 34 },
    layout: "alliance",
    visualTone: "partner trust, shared value, no fake luxury"
  }
];
```

- [ ] **Step 5: Add variant class to rendered HTML**

Change the frame line in `renderFacebookSquareHtml` to:

```ts
    `<main class="frame frame-${template.id} layout-${template.layout} variant-${input.templateVariant.toLowerCase()}">`,
```

- [ ] **Step 6: Run template tests**

Run:

```powershell
npm.cmd test -- lib/render/facebook-square-templates.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add lib/render/facebook-square-templates.ts lib/render/facebook-square-templates.test.ts
git commit -m "feat: add byt context render templates"
```

---

### Task 4: Add Publication-Ready Render Copy Builder

**Files:**
- Create: `lib/render/render-copy.ts`
- Test: `lib/render/render-copy.test.ts`
- Modify: `lib/render/render-planner.ts`

- [ ] **Step 1: Write the failing copy tests**

Create `lib/render/render-copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildRenderCopy, isInternalRenderCopyLine } from "./render-copy";
import type { GeneratedOutput, GenerationInput } from "../types";

describe("isInternalRenderCopyLine", () => {
  it("detects internal tone and founder confirmation lines", () => {
    expect(isInternalRenderCopyLine("Tone: Ấm áp, thực tế")).toBe(true);
    expect(isInternalRenderCopyLine("Cần founder xác nhận màu")).toBe(true);
    expect(isInternalRenderCopyLine("Một bữa sáng nhỏ, dễ bắt đầu.")).toBe(false);
  });
});

describe("buildRenderCopy", () => {
  it("uses publication-ready supporting copy instead of internal tone notes", () => {
    const copy = buildRenderCopy(input(), output({
      supportingCopy: [
        "Tone: Ấm áp, thực tế, không phán xét.",
        "Một bữa sáng nhỏ, dễ bắt đầu cho ngày bận rộn."
      ],
      mainMessage: "Giữ bữa sáng lành hơn mà không cần cầu kỳ."
    }));

    expect(copy.supporting_copy).toBe("Một bữa sáng nhỏ, dễ bắt đầu cho ngày bận rộn.");
  });

  it("falls back to design brief main message when all supporting lines are internal", () => {
    const copy = buildRenderCopy(input(), output({
      supportingCopy: ["Tone: Ấm áp."],
      mainMessage: "Giữ bữa sáng lành hơn mà không cần cầu kỳ."
    }));

    expect(copy.supporting_copy).toBe("Giữ bữa sáng lành hơn mà không cần cầu kỳ.");
  });
});

function input(): GenerationInput {
  return {
    outputType: "facebook_post_brief",
    goal: "Test",
    audience: "office_workers",
    productMembership: "Ban Mai Thức Giấc",
    campaign: "Ban Mai breakfast campaign",
    channel: "Facebook",
    format: "Facebook square post",
    offer: "",
    cta: "Nhắn Bếp",
    tone: "Ấm áp",
    notes: "",
    riskSensitivity: "balanced"
  };
}

function output(overrides: { supportingCopy: string[]; mainMessage: string }): GeneratedOutput {
  return {
    markdown: "",
    strategicAngle: "",
    copy: {
      headline: "Bữa sáng lành hơn",
      supportingCopy: overrides.supportingCopy
    },
    designBrief: {
      campaignAngle: "",
      audienceInsight: "",
      mainMessage: overrides.mainMessage,
      headline: "",
      supportingCopy: "",
      cta: "",
      visualConcept: "",
      layoutStructure: "",
      colorDirection: "",
      typographyDirection: "",
      imageDirection: "",
      iconIllustrationDirection: "",
      productMembershipAccuracyCheck: "",
      complianceCheck: "",
      brandCheckerScore: "",
      variations: []
    },
    salesCommunityCta: "Nhắn Bếp",
    complianceCheck: {
      riskLevel: "Low",
      reasons: [],
      saferRewrite: "",
      humanApprovalRequired: true
    },
    brandCheckerScore: {
      brandFit: 8,
      visualFit: 8,
      voiceFit: 8,
      businessModelFit: 8,
      productAccuracy: 8,
      membershipAccuracy: 8,
      communityFit: 8,
      conversionClarity: 8,
      channelFit: 8,
      complianceRisk: "Low"
    },
    founderConfirmationNeeded: []
  };
}
```

- [ ] **Step 2: Run the copy test to verify it fails**

Run:

```powershell
npm.cmd test -- lib/render/render-copy.test.ts
```

Expected: FAIL because `render-copy.ts` does not exist.

- [ ] **Step 3: Create `lib/render/render-copy.ts`**

Create:

```ts
import type { GeneratedOutput, GenerationInput } from "../types";

export interface RenderCopy {
  headline: string;
  supporting_copy: string;
  cta: string;
}

export function buildRenderCopy(input: GenerationInput, output: GeneratedOutput): RenderCopy {
  return {
    headline: output.copy.headline.trim(),
    supporting_copy: chooseSupportingCopy(output),
    cta: chooseCta(input, output)
  };
}

export function isInternalRenderCopyLine(value: string): boolean {
  const normalized = normalize(value);
  return (
    normalized.startsWith("tone:") ||
    normalized.includes("can founder xac nhan") ||
    normalized.includes("can xac nhan") ||
    normalized.includes("founder confirmation") ||
    normalized.includes("founder_confirmation_needed")
  );
}

function chooseSupportingCopy(output: GeneratedOutput): string {
  const publicLine = output.copy.supportingCopy
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !isInternalRenderCopyLine(line));

  if (publicLine) return publicLine;

  const mainMessage = output.designBrief.mainMessage.trim();
  if (mainMessage.length > 0 && !isInternalRenderCopyLine(mainMessage)) return mainMessage;

  return "Một lựa chọn nhỏ để bắt đầu thói quen lành hơn.";
}

function chooseCta(input: GenerationInput, output: GeneratedOutput): string {
  const cta = output.salesCommunityCta.trim();
  if (cta.length > 0 && !isInternalRenderCopyLine(cta)) return cta;

  const inputCta = input.cta.trim();
  if (inputCta.length > 0 && !isInternalRenderCopyLine(inputCta)) return inputCta;

  return "Nhắn Bếp để được gợi ý.";
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
```

- [ ] **Step 4: Use `buildRenderCopy` in `render-planner.ts`**

Import:

```ts
import { buildRenderCopy } from "./render-copy";
```

Inside `createFacebookSquareRenderPlan`, after `founderConfirmations`, add:

```ts
  const renderCopy = buildRenderCopy(input, output);
```

Then set payload copy fields from `renderCopy`:

```ts
      headline: renderCopy.headline,
      supporting_copy: renderCopy.supporting_copy,
      cta: renderCopy.cta,
```

- [ ] **Step 5: Run copy and planner tests**

Run:

```powershell
npm.cmd test -- lib/render/render-copy.test.ts lib/render/render-planner.test.ts
```

Expected: PASS after updating any old planner test assertions to expect public copy instead of `Tone: ...`.

- [ ] **Step 6: Commit**

```powershell
git add lib/render/render-copy.ts lib/render/render-copy.test.ts lib/render/render-planner.ts lib/render/render-planner.test.ts
git commit -m "feat: prepare public render copy"
```

---

### Task 5: Update Template Selection And Asset Context

**Files:**
- Modify: `lib/render/render-planner.ts`
- Test: `lib/render/render-planner.test.ts`

- [ ] **Step 1: Add failing template selection tests**

Add tests to `lib/render/render-planner.test.ts`:

```ts
it("selects Ban Mai breakfast template for Ban Mai inputs", () => {
  const plan = createFacebookSquareRenderPlan(
    { ...input, productMembership: "Ban Mai Thức Giấc", campaign: "Ban Mai breakfast campaign" },
    output,
    createAssetIndex([approvedProduct("ban-mai-photo", ["ban_mai", "breakfast"])])
  );

  expect(plan.payload.template_id).toBe("ban-mai-breakfast");
});

it("selects eating clean healthy living community template for community input", () => {
  const plan = createFacebookSquareRenderPlan(
    {
      ...input,
      outputType: "zalo_group_content",
      productMembership: "Ăn lành - Sống khỏe",
      campaign: "Nurture nhóm ăn lành sống khỏe"
    },
    output,
    createAssetIndex([])
  );

  expect(plan.payload.template_id).toBe("an-lanh-song-khoe-community");
  expect(plan.status).toBe("needs_human_approval");
});

it("blocks Ban Mai render when approved product photo has the wrong tags", () => {
  const plan = createFacebookSquareRenderPlan(
    { ...input, productMembership: "Ban Mai Thức Giấc", campaign: "Ban Mai breakfast campaign" },
    output,
    createAssetIndex([approvedProduct("detox-photo", ["detox", "drink"])])
  );

  expect(plan.status).toBe("blocked_for_missing_asset");
  expect(plan.status_reasons).toContain("Missing approved asset for slot: main_image");
});
```

Add this helper near existing test helpers:

```ts
function approvedProduct(id: string, tags: string[]): BrandAsset {
  return {
    id,
    type: "product_photo",
    path: `assets/${id}.png`,
    status: "approved",
    allowed_channels: ["Facebook"],
    allowed_formats: ["facebook_square"],
    usage_notes: "Approved test product photo.",
    founder_confirmation_needed: false,
    product_tags: tags,
    campaign_tags: [],
    visual_tags: ["product_clear"]
  };
}
```

- [ ] **Step 2: Run planner tests to verify they fail**

Run:

```powershell
npm.cmd test -- lib/render/render-planner.test.ts
```

Expected: FAIL because old template IDs and usage-note asset matching are still used.

- [ ] **Step 3: Import asset matcher**

In `lib/render/render-planner.ts`, replace the `BrandAsset` import and asset matching import with:

```ts
import { chooseApprovedAssetIdForSlot, normalizeRenderTag } from "./asset-matcher";
import { listMissingRequiredAssets } from "./assets";
```

Keep `BrandAssetIndex`, `RenderFormat`, `RenderPlan`, and `RenderTemplateId` imports.

- [ ] **Step 4: Replace `chooseTemplate`**

Replace `chooseTemplate` with:

```ts
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
```

- [ ] **Step 5: Replace `chooseAssetIdsBySlot` with tag context**

Replace the function body:

```ts
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
```

Add:

```ts
function buildRequiredProductTags(input: GenerationInput, templateId: RenderTemplateId): string[] {
  if (templateId === "ban-mai-breakfast") return ["ban_mai", "breakfast"];
  if (templateId === "product-focus-drink") return [normalizeRenderTag(input.productMembership)];
  return [];
}
```

Update the call site:

```ts
  const assetIdsBySlot = chooseAssetIdsBySlot(input, assetIndex, templateId);
```

Remove the old `chooseCandidateAssetId` helper.

- [ ] **Step 6: Add template variant to payload**

Add a helper:

```ts
function chooseTemplateVariant(input: GenerationInput): "A" | "B" | "C" {
  const text = normalize(input.notes);
  if (text.includes("variant b") || text.includes("bien the b")) return "B";
  if (text.includes("variant c") || text.includes("bien the c")) return "C";
  return "A";
}
```

Set payload field:

```ts
      template_variant: chooseTemplateVariant(input),
```

- [ ] **Step 7: Run planner tests**

Run:

```powershell
npm.cmd test -- lib/render/render-planner.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add lib/render/render-planner.ts lib/render/render-planner.test.ts
git commit -m "feat: select templates and assets by render context"
```

---

### Task 6: Update Asset Data Tags

**Files:**
- Modify: `brand-data/assets.json`

- [ ] **Step 1: Update approved BYT logo metadata**

In `brand-data/assets.json`, update `byt_logo_current_001` with structured metadata:

```json
      "product_tags": [],
      "campaign_tags": ["brand_core"],
      "visual_tags": ["logo", "warm", "natural"],
      "best_for": ["Facebook square internal render tests", "current BYT brand lockup"],
      "avoid_for": ["public publish without final founder logo placement approval"],
      "approval_scope": "internal_test"
```

Keep:

```json
      "status": "approved",
      "founder_confirmation_needed": false
```

- [ ] **Step 2: Update Ban Mai breakfast product photo metadata**

For `byt_product_photo_drive_006` with path `assets/photos/products/IMG_9414.JPG`, set:

```json
      "status": "approved",
      "product_tags": ["ban_mai", "yen_mach", "breakfast"],
      "campaign_tags": ["ban_mai_breakfast", "morning_routine"],
      "visual_tags": ["warm", "natural", "product_clear", "breakfast"],
      "best_for": ["Ban Mai breakfast Facebook square", "morning healthy routine post"],
      "avoid_for": ["detox product post", "ginger shot product post"],
      "approval_scope": "internal_test",
      "founder_confirmation_needed": false
```

- [ ] **Step 3: Keep unrelated product images blocked**

For `byt_product_photo_drive_001` with path `assets/photos/products/IMG_9411.JPG`, keep:

```json
      "status": "needs_founder_confirmation",
      "product_tags": ["detox", "drink"],
      "campaign_tags": ["product_focus_drink"],
      "visual_tags": ["warm", "natural", "product_clear"],
      "best_for": ["detox product post after founder approval"],
      "avoid_for": ["Ban Mai breakfast post"],
      "approval_scope": "not_approved",
      "founder_confirmation_needed": true
```

- [ ] **Step 4: Validate asset JSON through tests**

Run:

```powershell
npm.cmd test -- lib/render/assets.test.ts lib/render/asset-matcher.test.ts lib/render/render-planner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add brand-data/assets.json
git commit -m "data: tag byt render assets"
```

---

### Task 7: Implement Template-Specific HTML Layouts

**Files:**
- Modify: `lib/render/facebook-square-templates.ts`
- Test: `lib/render/facebook-square-templates.test.ts`

- [ ] **Step 1: Add HTML rendering tests for product and community layouts**

Add to `lib/render/facebook-square-templates.test.ts`:

```ts
it("renders product-led templates with image and copy panels", () => {
  const html = renderFacebookSquareHtml({
    templateId: "ban-mai-breakfast",
    templateVariant: "A",
    headline: "Bữa sáng lành hơn",
    supportingCopy: "Một hũ yến mạch nhỏ cho ngày bận rộn.",
    cta: "Nhắn Bếp",
    brandName: "Bếp Yêu Thương",
    assets: { main_image: "data:image/png;base64,abc" }
  });

  expect(html).toContain("image-panel");
  expect(html).toContain("copy-panel");
  expect(html).toContain("Bữa sáng lành hơn");
});

it("renders community templates without requiring a product image", () => {
  const html = renderFacebookSquareHtml({
    templateId: "an-lanh-song-khoe-community",
    templateVariant: "A",
    headline: "Ăn lành bắt đầu từ một bữa nhỏ",
    supportingCopy: "Không cần hoàn hảo, chỉ cần dễ duy trì hơn hôm qua.",
    cta: "Chia sẻ trong nhóm",
    brandName: "Bếp Yêu Thương",
    assets: {}
  });

  expect(html).toContain("layout-community");
  expect(html).toContain("Ăn lành. Uống sạch. Sống yêu thương.");
});
```

- [ ] **Step 2: Run template tests**

Run:

```powershell
npm.cmd test -- lib/render/facebook-square-templates.test.ts
```

Expected: FAIL until the renderer emits the layout classes and community fallback panel.

- [ ] **Step 3: Refactor body rendering with layout classes**

Inside `renderFacebookSquareHtml`, keep the existing escaping but replace the content area with:

```ts
    '<section class="content-grid">',
    renderVisualPanel(input, template),
    '<div class="copy-panel">',
    `<h1 data-qa="headline">${escapeHtml(input.headline)}</h1>`,
    `<p data-qa="supporting-copy">${escapeHtml(input.supportingCopy)}</p>`,
    `<div class="cta" data-qa="cta">${escapeHtml(input.cta)}</div>`,
    "</div>",
    "</section>",
```

Add below `renderFacebookSquareHtml`:

```ts
function renderVisualPanel(input: FacebookSquareHtmlInput, template: FacebookSquareTemplate): string {
  if (input.assets.main_image) {
    return `<div class="image-panel"><img class="main-image" src="${escapeHtml(input.assets.main_image)}" alt="" /></div>`;
  }

  const fallbackCopy = template.layout === "community"
    ? "Ăn lành. Uống sạch. Sống yêu thương."
    : "Bếp Yêu Thương";

  return `<div class="image-panel image-panel-soft"><div class="image-copy">${escapeHtml(fallbackCopy)}</div></div>`;
}
```

- [ ] **Step 4: Replace CSS with template-specific layout rules**

Keep the current base CSS and add these layout rules inside `getBaseCss`:

```css
    .layout-community .content-grid,
    .layout-membership .content-grid,
    .layout-recruitment .content-grid,
    .layout-point .content-grid,
    .layout-alliance .content-grid { grid-template-columns: .82fr 1.18fr; }
    .layout-community .image-panel-soft { background: #fffdf9; border-color: #dce4dc; }
    .layout-community .image-copy { font-size: 42px; line-height: 1.2; }
    .layout-membership .image-panel-soft { background: #fff8ec; }
    .layout-recruitment .image-panel-soft,
    .layout-point .image-panel-soft,
    .layout-alliance .image-panel-soft { background: #f8fbf7; }
    .frame-an-lanh-song-khoe-community h1,
    .frame-zalo-community h1 { font-size: 54px; }
    .frame-sale-ctv-recruitment h1,
    .frame-connected-point-posm h1,
    .frame-brand-alliance h1 { font-size: 50px; }
    .variant-b .content-grid { grid-template-columns: 1.08fr .92fr; }
    .variant-c .content-grid { gap: 34px; }
```

- [ ] **Step 5: Run template tests**

Run:

```powershell
npm.cmd test -- lib/render/facebook-square-templates.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/render/facebook-square-templates.ts lib/render/facebook-square-templates.test.ts
git commit -m "feat: render byt template layouts"
```

---

### Task 8: Extract Data URL Asset Resolver

**Files:**
- Create: `lib/render/asset-resolver.ts`
- Test: `lib/render/asset-resolver.test.ts`
- Modify: `app/api/render/facebook-square/route.ts`

- [ ] **Step 1: Write asset resolver tests**

Create `lib/render/asset-resolver.test.ts`:

```ts
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { resolveAssetDataUrl } from "./asset-resolver";
import type { BrandAssetIndex } from "./types";

describe("resolveAssetDataUrl", () => {
  it("returns a data URL for a local png asset inside the repo", () => {
    mkdirSync(path.join(process.cwd(), "tmp-test-assets"), { recursive: true });
    writeFileSync(path.join(process.cwd(), "tmp-test-assets", "asset.png"), Buffer.from([137, 80, 78, 71]));

    const url = resolveAssetDataUrl(index("tmp-test-assets/asset.png"), "asset-1");

    expect(url).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects unsupported image file types", () => {
    mkdirSync(path.join(process.cwd(), "tmp-test-assets"), { recursive: true });
    writeFileSync(path.join(process.cwd(), "tmp-test-assets", "asset.txt"), "not image");

    expect(() => resolveAssetDataUrl(index("tmp-test-assets/asset.txt"), "asset-1"))
      .toThrow("Unsupported image file type for asset id: asset-1");
  });
});

function index(assetPath: string): BrandAssetIndex {
  return {
    metadata: { schema_version: "0.1.0", language: "vi", status: "draft" },
    assets: [
      {
        id: "asset-1",
        type: "product_photo",
        path: assetPath,
        status: "approved",
        allowed_channels: ["Facebook"],
        allowed_formats: ["facebook_square"],
        usage_notes: "Test asset.",
        founder_confirmation_needed: false
      }
    ]
  };
}
```

- [ ] **Step 2: Run resolver tests to verify they fail**

Run:

```powershell
npm.cmd test -- lib/render/asset-resolver.test.ts
```

Expected: FAIL because `asset-resolver.ts` does not exist.

- [ ] **Step 3: Create `lib/render/asset-resolver.ts`**

Create:

```ts
import fs from "fs";
import path from "path";
import type { BrandAssetIndex } from "./types";

export class AssetResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetResolutionError";
  }
}

export function resolveAssetDataUrl(assetIndex: BrandAssetIndex, assetId: string): string {
  const asset = assetIndex.assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new AssetResolutionError(`Unknown asset id in render payload: ${assetId}`);
  }

  const repoRoot = path.resolve(process.cwd());
  const assetPath = path.resolve(process.cwd(), asset.path);
  const relativeAssetPath = path.relative(repoRoot, assetPath);

  if (relativeAssetPath.startsWith("..") || path.isAbsolute(relativeAssetPath)) {
    throw new AssetResolutionError(`Asset path escapes repository root for asset id: ${assetId}`);
  }

  const mimeType = getImageMimeType(assetPath, assetId);
  const encoded = fs.readFileSync(assetPath).toString("base64");

  return `data:${mimeType};base64,${encoded}`;
}

function getImageMimeType(assetPath: string, assetId: string): string {
  const extension = path.extname(assetPath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";

  throw new AssetResolutionError(`Unsupported image file type for asset id: ${assetId}`);
}
```

- [ ] **Step 4: Use resolver in route**

In `app/api/render/facebook-square/route.ts`:

Import:

```ts
import { AssetResolutionError, resolveAssetDataUrl } from "../../../../lib/render/asset-resolver";
```

Remove route-local imports for `fs`, `path`, and `pathToFileURL` that are only used for asset resolving.

Inside `resolveTemplateAssetUrls`, change:

```ts
    resolvedAssets[slot] = resolveAssetDataUrl(assetIndex, assetId);
```

Remove the route-local `resolveAssetFileUrl` or `resolveAssetDataUrl`, `getImageMimeType`, and `AssetResolutionError` definitions.

- [ ] **Step 5: Run resolver and route helper tests**

Run:

```powershell
npm.cmd test -- lib/render/asset-resolver.test.ts app/api/render/facebook-square/route-helpers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/render/asset-resolver.ts lib/render/asset-resolver.test.ts app/api/render/facebook-square/route.ts
git commit -m "feat: resolve render assets as data urls"
```

---

### Task 9: End-To-End Verification And Docs

**Files:**
- Modify: `docs/future-automation-plan.md`
- Do not commit generated files in `outputs/`.

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Expected:

- `npm.cmd test`: all Vitest tests pass.
- `npm.cmd run typecheck`: exits 0.
- `npm.cmd run build`: Next.js production build succeeds and lists `/api/render/facebook-square`.

- [ ] **Step 2: Start production server**

Run:

```powershell
npm.cmd run start -- -H 127.0.0.1 -p 3000
```

Expected: server prints `Local: http://127.0.0.1:3000`.

- [ ] **Step 3: Smoke render Ban Mai breakfast**

In a second PowerShell session, run:

```powershell
$body = @{
  outputType = "facebook_post_brief"
  goal = "Tao post test cho Ban Mai Thuc Giac"
  audience = "office_workers"
  productMembership = "Ban Mai Thuc Giac"
  campaign = "Ban Mai breakfast campaign"
  channel = "Facebook"
  format = "Facebook square post"
  offer = ""
  cta = "Nhan Bep de duoc goi y."
  tone = "Am ap, thuc te, khong phan xet"
  notes = "Variant A smoke test"
  riskSensitivity = "balanced"
} | ConvertTo-Json -Depth 6

$banMaiResponse = Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:3000/api/render/facebook-square" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body

$banMaiResponse
```

Expected:

- `status` is `needs_human_approval`.
- `payload.template_id` is `ban-mai-breakfast`.
- `payload.assets.main_image` is `byt_product_photo_drive_006`.
- `qa.passed` is `true`.

- [ ] **Step 4: Smoke render Eating Clean / Healthy Living community**

Run:

```powershell
$body = @{
  outputType = "zalo_group_content"
  goal = "Tao post nhom an lanh song khoe"
  audience = "direct_consumers"
  productMembership = "An lanh - Song khoe"
  campaign = "Nurture nhom an lanh song khoe"
  channel = "Zalo group"
  format = "Zalo group post"
  offer = ""
  cta = "Chia se bua an nho cua ban."
  tone = "Gan gui, thuc te, khong phan xet"
  notes = "Community-first smoke test"
  riskSensitivity = "balanced"
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:3000/api/render/facebook-square" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

Expected:

- `status` is `needs_human_approval`.
- `payload.template_id` is `an-lanh-song-khoe-community`.
- `payload.assets.main_image` is absent.
- `qa.passed` is `true`.

- [ ] **Step 5: Approve one internal smoke render**

Use the `$banMaiResponse` value captured in Step 3:

```powershell
$body = @{
  job_id = $banMaiResponse.job_id
  decision = "approved"
  approver = "BYT internal test"
  notes = "Internal smoke approval for Phase 1 template system. Founder still reviews before public publishing."
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:3000/api/render/facebook-square/approve" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

Expected:

- `status` is `approved`.
- `final_png` points to `outputs/facebook-square/.../final.png`.
- The file exists locally.

- [ ] **Step 6: Update automation docs**

In `docs/future-automation-plan.md`, add a short Phase 1 note:

```md
## Phase 1 HTML Template Design System

The first production path uses local HTML templates, structured asset tags, Visual QA, and human approval before final PNG export. External Canva, Figma, image generation, and Zalo publishing remain outside Phase 1.
```

- [ ] **Step 7: Commit docs**

```powershell
git add docs/future-automation-plan.md
git commit -m "docs: document html template design system phase"
```

---

## Self-Review Checklist

- Spec coverage:
  - Phase 1 context templates are implemented in Task 3 and Task 7.
  - Structured asset metadata and no wrong fallback are implemented in Task 1, Task 2, Task 5, and Task 6.
  - Publication-ready copy is implemented in Task 4.
  - Visual QA and approval flow are verified in Task 9.
  - Phase 2 hybrid background is documented as outside this plan.
- Placeholder scan:
  - The plan contains no unfinished task markers, incomplete file paths, or undefined function names.
- Type consistency:
  - `RenderTemplateId`, `template_variant`, `BrandAsset` metadata fields, and matcher request types are introduced before use in planner and templates.
- Scope control:
  - No Canva/Figma/image generation/Zalo publishing is implemented in Phase 1.
