import { describe, expect, it } from "vitest";
import type { Page } from "playwright";
import { mergeQaResults, runBrowserVisualQa, runStaticVisualQa } from "./visual-qa";

describe("static visual QA", () => {
  it("passes for safe public HTML and copy lengths", () => {
    const result = runStaticVisualQa({
      html: "<main>Safe public HTML</main>",
      headline: "Bữa ăn lành hơn",
      supportingCopy: "Một lựa chọn nhỏ cho ngày bận rộn.",
      cta: "Nhắn Bếp"
    });

    expect(result.passed).toBe(true);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

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

  it("fails when template-specific headline max is stricter than the global max", () => {
    const result = runStaticVisualQa({
      html: "<main>Safe</main>",
      headline: "Headline length is below global max but above template max ok",
      supportingCopy: "Supporting copy",
      cta: "CTA",
      maxLengths: {
        headline: 54,
        supportingCopy: 130,
        cta: 40
      }
    });

    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.name === "headline_length" && !check.passed)).toBe(true);
  });

  it("fails for normalized internal confirmation phrase variants", () => {
    const variants = [
      "Cần founder xác nhận",
      "Cần xác nhận",
      "founder_confirmation_needed",
      "Founder confirmation needed",
      "Cần founder xac nhan"
    ];

    for (const variant of variants) {
      const result = runStaticVisualQa({
        html: `<main>${variant}</main>`,
        headline: "Headline",
        supportingCopy: "Supporting copy",
        cta: "CTA"
      });

      expect(result.passed).toBe(false);
      expect(result.checks.some((check) => check.name === "no_founder_confirmation_text" && !check.passed)).toBe(true);
    }
  });
});

describe("browser visual QA", () => {
  it("passes background image check when no required backgrounds are configured", async () => {
    const page = {
      evaluate: async () => ({
        frameSize: { width: 1080, height: 1080 },
        imagesLoaded: true,
        overflowCount: 0
      })
    } as unknown as Page;

    const result = await runBrowserVisualQa(page, { requiredBackgroundUrls: [] });

    expect(result.passed).toBe(true);
    expect(result.checks.some((check) => check.name === "background_images_loaded" && check.passed)).toBe(true);
  });
});

describe("visual QA result merging", () => {
  it("fails if any child result fails", () => {
    const result = mergeQaResults(
      {
        passed: true,
        checks: [{ name: "first", passed: true, details: "passed" }]
      },
      {
        passed: false,
        checks: [{ name: "second", passed: false, details: "failed" }]
      }
    );

    expect(result.passed).toBe(false);
    expect(result.checks).toHaveLength(2);
  });
});
