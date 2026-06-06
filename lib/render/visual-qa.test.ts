import { describe, expect, it } from "vitest";
import { runStaticVisualQa } from "./visual-qa";

describe("static visual QA", () => {
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
});
