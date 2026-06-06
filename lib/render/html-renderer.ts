import { chromium } from "playwright";
import { mergeQaResults, runBrowserVisualQa, runStaticVisualQa } from "./visual-qa";
import type { VisualQaResult } from "./types";
import type { VisualQaMaxLengths } from "./visual-qa";

export interface HtmlRenderResult {
  png: Buffer;
  qa: VisualQaResult;
}

export async function renderHtmlToPng(input: {
  html: string;
  headline: string;
  supportingCopy: string;
  cta: string;
  maxLengths?: VisualQaMaxLengths;
  baseUrl?: string;
  requiredBackgroundUrls?: string[];
}): Promise<HtmlRenderResult> {
  const staticQa = runStaticVisualQa({
    html: input.html,
    headline: input.headline,
    supportingCopy: input.supportingCopy,
    cta: input.cta,
    maxLengths: input.maxLengths
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
    await page.setContent(addBaseUrl(input.html, input.baseUrl), { waitUntil: "networkidle" });
    const browserQa = await runBrowserVisualQa(page, {
      requiredBackgroundUrls: input.requiredBackgroundUrls
    });
    const qa = mergeQaResults(staticQa, browserQa);
    const png = qa.passed
      ? await page.screenshot({ type: "png", fullPage: false })
      : Buffer.from([]);

    return { png, qa };
  } finally {
    await browser.close();
  }
}

function addBaseUrl(html: string, baseUrl?: string): string {
  if (!baseUrl) {
    return html;
  }

  const baseElement = `<base href="${escapeAttribute(baseUrl)}" />`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseElement}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseElement}</head>`);
  }

  return `<!doctype html><html><head>${baseElement}</head><body>${html}</body></html>`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
