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
