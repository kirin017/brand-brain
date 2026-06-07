import type { Page } from "playwright";
import type { VisualQaResult } from "./types";

export interface VisualQaMaxLengths {
  headline: number;
  supportingCopy: number;
  cta: number;
}

export interface BrowserVisualQaOptions {
  requiredBackgroundUrls?: string[];
  backgroundImageTimeoutMs?: number;
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
    const backgroundElements = frame
      ? [frame, ...Array.from(frame.querySelectorAll("*"))]
      : Array.from(document.querySelectorAll("*"));
    const overflowTolerancePx = 2;
    const overflowElements = Array.from(document.querySelectorAll("[data-qa]")).filter((element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.scrollWidth - htmlElement.clientWidth > overflowTolerancePx ||
        htmlElement.scrollHeight - htmlElement.clientHeight > overflowTolerancePx
      );
    });
    const overflowQaNames = overflowElements.map((element) => element.getAttribute("data-qa") ?? "unknown");
    const extractBackgroundUrls = (backgroundImage: string): string[] => {
      const urls: string[] = [];
      const pattern = /url\((?:"([^"]+)"|'([^']+)'|([^)"']+))\)/gi;
      let match = pattern.exec(backgroundImage);

      while (match) {
        urls.push((match[1] ?? match[2] ?? match[3]).trim());
        match = pattern.exec(backgroundImage);
      }

      return urls;
    };
    const backgroundImageUrls = Array.from(new Set(
      backgroundElements.flatMap((element) => extractBackgroundUrls(getComputedStyle(element).backgroundImage))
    ));

    return {
      frameSize: frame ? { width: frame.clientWidth, height: frame.clientHeight } : null,
      imagesLoaded: imageElements.every((image) => image.complete && image.naturalWidth > 0),
      overflowCount: overflowElements.length,
      overflowQaNames,
      backgroundImageUrls
    };
  });
  const backgroundUrls = Array.from(new Set([
    ...(options.requiredBackgroundUrls ?? []),
    ...(browserChecks.backgroundImageUrls ?? [])
  ]));
  const backgroundResults = backgroundUrls.length > 0
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
    }, { urls: backgroundUrls, timeoutMs: options.backgroundImageTimeoutMs ?? 3000 })
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
      details: getTextOverflowDetails(browserChecks.overflowCount, browserChecks.overflowQaNames)
    },
    {
      name: "background_images_loaded",
      passed: failedBackgroundUrls.length === 0,
      details: getBackgroundImageDetails(backgroundUrls, failedBackgroundUrls)
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

function getTextOverflowDetails(overflowCount: number, overflowQaNames?: string[]): string {
  if (overflowCount === 0) {
    return "Overflow element count is 0.";
  }

  const names = (overflowQaNames ?? []).filter((name) => name.length > 0);
  if (names.length === 0) {
    return `Overflow element count is ${overflowCount}.`;
  }

  return `Overflow element count is ${overflowCount}: ${names.join(", ")}.`;
}

function getBackgroundImageDetails(backgroundUrls: string[], failedBackgroundUrls: string[]): string {
  if (backgroundUrls.length === 0) {
    return "No background image URLs found.";
  }
  if (failedBackgroundUrls.length === 0) {
    return `All ${backgroundUrls.length} background image URLs loaded.`;
  }

  return `Failed background image URLs: ${failedBackgroundUrls.join(", ")}`;
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
