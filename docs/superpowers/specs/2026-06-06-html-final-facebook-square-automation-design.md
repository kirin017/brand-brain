# BYT HTML Final Facebook Square Automation Design

## Summary

BYT will automate final Facebook square post production through controlled HTML templates, approved asset metadata, deterministic Brand Brain generation, Brand Checker gates, visual QA, human approval, and structured export. The first supported final format is a 1080x1080 Facebook square post.

This design deliberately avoids automatic Zalo publishing and avoids free-form AI image generation for final assets. Canva, Figma, and image generation may remain supporting tools later, but the final render path for this phase is HTML-to-image.

## Goals

- Generate final-ready Facebook square post assets from Brand Brain data.
- Keep BYT brand, product, membership, community, and compliance rules visible in the workflow.
- Use HTML/CSS templates for deterministic layout and text rendering.
- Use only approved product/brand/background assets for final output.
- Block final export when required assets, founder confirmations, compliance approval, or QA checks are missing.
- Export PNG, render HTML, metadata, Brand Checker report, and approval record.

## Non-Goals

- No automatic Zalo publishing in this phase.
- No free-form AI-generated final product images.
- No automatic use of unapproved logo, QR, packaging, product photo, color, or font assets.
- No full custom backend in the first implementation unless later approved.
- No replacement of Brand Checker or human approval for risky content.

## Recommended Approach

Use a hybrid final-render pipeline:

```text
Fixed HTML templates
+ lightweight component slots
+ approved asset library
+ Playwright-style render
+ Brand Checker gates
+ visual QA
+ human approval
```

AI agents should generate structured data, select from approved templates, and run checks. They should not write arbitrary one-off HTML for each design.

## Considered Options

### Option A: Fixed HTML Template Library

Use predefined HTML/CSS templates and fill them with generated JSON.

Benefits:

- Highest control and repeatability.
- Best fit for final assets.
- Low layout risk.
- Easy to test and version.

Tradeoff:

- Less creative variety until more template variants are created.

### Option B: Component-Based HTML Layout System

Build reusable blocks such as headline, product card, CTA, badge, QR area, and footer, then compose layouts from rules.

Benefits:

- More flexible than fixed templates.
- Still controlled if component rules are strict.

Tradeoff:

- More complexity and more QA surface.

### Option C: Full AI Image Generation

Use image generation for the whole post.

Benefits:

- Fast concept generation.

Tradeoff:

- Too risky for final BYT F&B assets because product, packaging, logo, QR, and Vietnamese text fidelity can fail.

Decision: Use Option A first, with a small amount of Option B slot flexibility. Do not use Option C for final output.

## Architecture

```text
Content Request
→ Brand Brain Generator
→ Text Brand Checker
→ Template Selector
→ Approved Asset Selector
→ Render Payload Builder
→ HTML Renderer
→ Visual QA
→ Final Brand Checker
→ Human Approval
→ Export
```

## First Supported Format

Facebook square post:

- Size: 1080x1080.
- Output: PNG final, HTML render source, JSON metadata, Markdown Brand Checker report, JSON approval record.
- Initial templates:
  - `product-focus`
  - `membership-focus`
  - `community-focus`

## Content Request

The request should capture:

- Goal
- Audience
- Product or membership
- Campaign
- Channel: Facebook
- Format: Facebook square post
- Offer
- CTA
- Tone
- Notes
- Risk sensitivity

The request must not bypass Brand Checker.

## Brand Brain Generator

The generator reads existing repo sources:

- `brand-data/brand-brain.json`
- `brand-data/products.json`
- `brand-data/memberships.json`
- `brand-data/customer-segments.json`
- `brand-data/channels.json`
- `brand-data/campaigns.json`
- `brand-data/voice-rules.json`
- `brand-data/compliance-rules.json`
- `brand-data/brand-check-rubric.json`
- `templates/`

It produces:

- Headline
- Supporting copy
- CTA
- Product/membership facts used
- Compliance notes
- Founder confirmation list
- Template recommendation
- Asset requirements

## Text Brand Checker Gate

Run before rendering. Block final render when:

- Compliance risk is `High`.
- Copy includes disease treatment, medical cure, guaranteed weight loss, miracle detox/thải độc, unsupported digestion/immunity/diabetes/liver/blood-fat/insomnia claims.
- Sales, leader, affiliate, or connected point copy promises income, revenue, profit, or guaranteed orders.
- Membership price/benefits are used as final facts without approval.
- Required founder confirmations remain unresolved for final output.

Medium-risk output may continue only if the workflow marks human approval as required.

## Template Library

Recommended future folder:

```text
render-templates/
  facebook-square/
    product-focus.html
    membership-focus.html
    community-focus.html
```

Each template should be a controlled 1080x1080 HTML/CSS layout with defined slots:

- Brand/logo slot
- Main image slot
- Headline slot
- Supporting copy slot
- CTA slot
- Product/membership badge slot
- Optional background slot
- Optional footer/compliance metadata slot for non-public render notes

Templates must not invent final assets or brand rules.

## Asset Library

Create a machine-readable asset index later, likely:

```text
brand-data/assets.json
```

Each asset record should include:

```json
{
  "id": "product_sua_hat_001",
  "type": "product_photo",
  "path": "assets/products/sua-hat-001.png",
  "status": "approved",
  "allowed_channels": ["Facebook", "Zalo"],
  "allowed_formats": ["facebook_square"],
  "usage_notes": "Ảnh sản phẩm thật, dùng cho post bán hàng nhẹ.",
  "founder_confirmation_needed": false
}
```

Allowed statuses:

- `draft`
- `needs_founder_confirmation`
- `approved`
- `restricted`
- `do_not_use`

Final output can only use required assets with status `approved`.

## Asset Rules

Block final output when:

- Required product image is missing.
- Required logo asset is missing or not approved.
- QR is required but missing or placeholder.
- Background image is marked `draft`, `restricted`, or `do_not_use`.
- AI-generated image has not been approved and indexed.
- Asset is not allowed for Facebook square format.

If a product-specific asset is missing, the system must not create a fake product image. It may suggest using a community-focused template only if that template does not require a product-specific visual.

## Render Payload

Before rendering, create a normalized payload:

```json
{
  "job_id": "2026-06-06-facebook-ban-mai-001",
  "format": "facebook_square",
  "template_id": "membership-focus",
  "campaign": "Ban Mai breakfast campaign",
  "product_membership": "Ban Mai Thức Giấc",
  "headline": "Bữa sáng lành hơn cho ngày bận rộn",
  "supporting_copy": "Một lựa chọn gọn, dễ duy trì cho buổi sáng.",
  "cta": "Nhắn Bếp để được gợi ý.",
  "assets": {
    "logo": "byt_logo_primary",
    "main_image": "ban_mai_product_001",
    "background": "morning_kitchen_001"
  },
  "compliance": {
    "risk_level": "Low",
    "human_approval_required": false
  },
  "founder_confirmation_needed": []
}
```

## Job Status

Use explicit statuses:

- `draft`
- `blocked_for_missing_asset`
- `blocked_for_compliance`
- `ready_for_render`
- `rendered`
- `failed_visual_qa`
- `needs_human_approval`
- `approved`
- `exported`
- `rejected`

The system should never silently convert a blocked job into a final output.

## Visual QA

Minimum checks:

- Rendered PNG is 1080x1080.
- All required images load successfully.
- No asset placeholder remains in final.
- No `Cần founder xác nhận` text appears inside final public image.
- Headline fits its container.
- CTA fits its container.
- Supporting copy does not overflow.
- Text amount stays within template limits.
- Product image is visible when template requires it.
- Logo is visible when template requires it.
- QR is real when template requires it.
- Contrast is readable enough for manual review.

Initial implementation may use DOM checks, image load checks, text length checks, and screenshot inspection. Later versions may add vision-based QA.

## Final Brand Checker Gate

After rendering, run a final check against:

- Copy
- Template ID
- Asset IDs and statuses
- Channel and format
- Compliance risk
- Founder confirmation list

Block export if:

- Brand Checker recommendation is `Reject`.
- Compliance risk is `High`.
- Required founder confirmations remain.
- Required assets are not approved.
- Visual QA failed.

## Human Approval

Early phase requires human approval for every final asset.

Recommended transition:

```text
rendered
→ needs_human_approval
→ approved
→ exported
```

Future low-risk auto-approval may be considered only when:

- Template is approved.
- Required assets are approved.
- Compliance risk is `Low`.
- No price/QR/health-sensitive/founder-confirmation fields are unresolved.
- Visual QA passes.

## Export Structure

Use:

```text
outputs/
  facebook-square/
    2026-06/
      2026-06-06-ban-mai-breakfast/
        render.html
        final.png
        metadata.json
        brand-check.md
        approval.json
```

File roles:

- `render.html`: exact HTML source used for the render.
- `final.png`: final image asset.
- `metadata.json`: input, output, template, asset, status, and timestamps.
- `brand-check.md`: Brand Checker report.
- `approval.json`: approver, approval time, decision, and notes.

## Error Handling

- Missing required asset: set `blocked_for_missing_asset`, show missing asset IDs/types and suggested action.
- High-risk compliance: set `blocked_for_compliance`, include risk reason and safer rewrite.
- Render failure: set `failed_visual_qa` or render error status with log.
- Visual overflow: set `failed_visual_qa`, identify field causing overflow.
- Unapproved asset: block final and require asset approval or replacement.

## Testing Strategy

At minimum:

- TypeScript check with `npm.cmd run typecheck`.
- Production build with `npm.cmd run build`.
- Unit-style checks for payload validation and status transitions when tests are introduced.
- Fixture-based render tests for the three initial templates.
- Visual QA fixture where intentionally long headline fails.
- Compliance fixture where `chữa bệnh`, `thải độc`, and `giảm cân nhanh` are blocked.

## Implementation Phases

### Phase 1: Data And Gates

- Add asset index draft.
- Add render payload schema/types.
- Add status rules.
- Extend generator output for template and asset requirements.

### Phase 2: HTML Templates

- Add three Facebook square templates.
- Add deterministic render path.
- Export HTML and PNG.

### Phase 3: QA And Approval

- Add visual QA.
- Add approval record.
- Block export until QA and approval pass.

### Phase 4: Archive And Future Integrations

- Add archive folder conventions.
- Prepare Drive upload integration later.
- Keep Zalo publish out of scope until separately designed.

## Open Decisions Captured As Requirements

- First final format is Facebook square post.
- HTML render creates final image, not just designer draft.
- AI image generation is not used directly for final product images.
- Final output requires approved assets.
- Human approval remains required in the early phase.
- Zalo publishing is out of scope for this design.

