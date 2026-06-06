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
