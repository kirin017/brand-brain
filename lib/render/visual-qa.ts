import type { Page } from "playwright";
import type { VisualQaResult } from "./types";

export interface VisualQaMaxLengths {
  headline: number;
  supportingCopy: number;
  cta: number;
}

export interface BrowserVisualQaOptions {
  requiredBackgroundUrls?: string[];
}

const defaultMaxLengths: VisualQaMaxLengths = {
  headline: 62,
  supportingCopy: 130,
  cta: 40
};

const internalConfirmationPhrases = [
  "can founder xac nhan",
  "can xac nhan",
  "founder_confirmation_needed",
  "founder confirmation needed"
];

export function runStaticVisualQa(input: {
  html: string;
  headline: string;
  supportingCopy: string;
  cta: string;
  maxLengths?: VisualQaMaxLengths;
}): VisualQaResult {
  const maxLengths = input.maxLengths ?? defaultMaxLengths;
  const normalizedHtml = normalizeGuardrailText(input.html);
  const checks = [
    {
      name: "no_founder_confirmation_text",
      passed: !internalConfirmationPhrases.some((phrase) => normalizedHtml.includes(phrase)),
      details: "Final public HTML must not contain founder confirmation text."
    },
    {
      name: "headline_length",
      passed: input.headline.length <= maxLengths.headline,
      details: `Headline length is ${input.headline.length}; max is ${maxLengths.headline}.`
    },
    {
      name: "supporting_copy_length",
      passed: input.supportingCopy.length <= maxLengths.supportingCopy,
      details: `Supporting copy length is ${input.supportingCopy.length}; max is ${maxLengths.supportingCopy}.`
    },
    {
      name: "cta_length",
      passed: input.cta.length <= maxLengths.cta,
      details: `CTA length is ${input.cta.length}; max is ${maxLengths.cta}.`
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export async function runBrowserVisualQa(
  page: Page,
  options: BrowserVisualQaOptions = {}
): Promise<VisualQaResult> {
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
  const requiredBackgroundUrls = options.requiredBackgroundUrls ?? [];
  const backgroundResults = requiredBackgroundUrls.length > 0
    ? await page.evaluate(async ({ urls, timeoutMs }) => {
      const loadImage = (url: string): Promise<{ url: string; loaded: boolean }> => new Promise((resolve) => {
        const image = new Image();
        const timeout = window.setTimeout(() => {
          cleanup();
          resolve({ url, loaded: false });
        }, timeoutMs);
        const cleanup = () => {
          window.clearTimeout(timeout);
          image.onload = null;
          image.onerror = null;
        };

        image.onload = () => {
          cleanup();
          resolve({ url, loaded: true });
        };
        image.onerror = () => {
          cleanup();
          resolve({ url, loaded: false });
        };
        image.src = url;
      });

      return Promise.all(urls.map((url) => loadImage(url)));
    }, { urls: requiredBackgroundUrls, timeoutMs: 3000 })
    : [];
  const failedBackgroundUrls = backgroundResults
    .filter((result) => !result.loaded)
    .map((result) => result.url);

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
    },
    {
      name: "background_images_loaded",
      passed: failedBackgroundUrls.length === 0,
      details: requiredBackgroundUrls.length === 0
        ? "No required background images configured."
        : `Loaded ${requiredBackgroundUrls.length - failedBackgroundUrls.length}/${requiredBackgroundUrls.length} required background images.`
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

function normalizeGuardrailText(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
