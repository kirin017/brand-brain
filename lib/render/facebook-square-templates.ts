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
  layout: "split-product" | "membership" | "community" | "recruitment" | "point" | "alliance";
  visualTone: string;
}

export interface FacebookSquareHtmlInput {
  templateId: RenderTemplateId;
  templateVariant: "A" | "B" | "C";
  headline: string;
  supportingCopy: string;
  cta: string;
  brandName: string;
  assets: {
    logo?: string;
    main_image?: string;
    background?: string;
  };
}

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

export function listFacebookSquareTemplates(): FacebookSquareTemplate[] {
  return templates.map((template) => ({
    ...template,
    requiredAssetSlots: [...template.requiredAssetSlots],
    maxLengths: { ...template.maxLengths }
  }));
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
    `<main class="frame frame-${template.id} layout-${template.layout} variant-${input.templateVariant.toLowerCase()}">`,
    '<section class="brand-row">',
    input.assets.logo
      ? `<img class="brand-logo" src="${escapeHtml(input.assets.logo)}" alt="${escapeHtml(input.brandName)}" />`
      : `<div class="brand-text">${escapeHtml(input.brandName)}</div>`,
    "</section>",
    '<section class="content-grid">',
    renderVisualPanel(input, template),
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

function renderVisualPanel(input: FacebookSquareHtmlInput, template: FacebookSquareTemplate): string {
  if (input.assets.main_image) {
    return `<div class="image-panel"><img class="main-image" src="${escapeHtml(input.assets.main_image)}" alt="" /></div>`;
  }

  const fallbackCopy =
    template.layout === "community" ? "Ăn lành. Uống sạch. Sống yêu thương." : "Bếp Yêu Thương";

  return `<div class="image-panel image-panel-soft"><div class="image-copy">${escapeHtml(fallbackCopy)}</div></div>`;
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
    h1 { margin: 0; font-size: 52px; line-height: 1.25; font-weight: 850; color: #17211b; overflow-wrap: anywhere; }
    p { margin: 0; font-size: 31px; line-height: 1.35; color: #637066; }
    .cta { align-self: flex-start; max-width: 100%; border-radius: 8px; background: #326b4f; color: #ffffff; padding: 18px 24px; font-size: 26px; font-weight: 800; line-height: 1.2; overflow-wrap: anywhere; }
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
  `;
}
