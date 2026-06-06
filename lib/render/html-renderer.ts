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
