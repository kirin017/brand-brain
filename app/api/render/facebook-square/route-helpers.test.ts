import path from "path";
import { describe, expect, it } from "vitest";
import {
  checkApprovalRouteAccess,
  sanitizeQaForResponse,
  toRelativeOutputPath,
  validateFounderConfirmationApproval
} from "./route-helpers";

describe("facebook square route helpers", () => {
  it("converts absolute archive and final paths under the repo to relative output paths", () => {
    const repoRoot = path.resolve(process.cwd());
    const archivePath = path.join(
      repoRoot,
      "outputs",
      "facebook-square",
      "2026-06",
      "2026-06-07-facebook-ban-mai-00000001"
    );
    const finalPath = path.join(archivePath, "final.png");

    const relativeArchivePath = toRelativeOutputPath(archivePath, repoRoot);
    const relativeFinalPath = toRelativeOutputPath(finalPath, repoRoot);

    expect(relativeArchivePath).toBe("outputs/facebook-square/2026-06/2026-06-07-facebook-ban-mai-00000001");
    expect(relativeFinalPath).toBe("outputs/facebook-square/2026-06/2026-06-07-facebook-ban-mai-00000001/final.png");
    expect(path.isAbsolute(relativeArchivePath)).toBe(false);
    expect(path.isAbsolute(relativeFinalPath)).toBe(false);
  });

  it("allows localhost approval requests when no internal token is configured", () => {
    expect(checkApprovalRouteAccess({
      hostHeader: "localhost:3000",
      requestToken: null,
      configuredToken: undefined
    })).toEqual({ allowed: true });
  });

  it("rejects non-localhost approval requests when no internal token is configured", () => {
    const decision = checkApprovalRouteAccess({
      hostHeader: "byt.example.com",
      requestToken: null,
      configuredToken: undefined
    });

    expect(decision).toEqual({
      allowed: false,
      status: 403,
      error: "Internal approval requires BYT_INTERNAL_API_TOKEN outside localhost."
    });
  });

  it("requires a matching internal token when one is configured", () => {
    expect(checkApprovalRouteAccess({
      hostHeader: "localhost:3000",
      requestToken: "wrong",
      configuredToken: "secret"
    })).toEqual({
      allowed: false,
      status: 403,
      error: "Internal approval token is missing or invalid."
    });

    expect(checkApprovalRouteAccess({
      hostHeader: "byt.example.com",
      requestToken: "secret",
      configuredToken: "secret"
    })).toEqual({ allowed: true });
  });

  it("requires approval notes when founder confirmations remain", () => {
    expect(validateFounderConfirmationApproval({
      decision: "approved",
      founderConfirmationNeeded: ["Logo chính thức cần founder xác nhận."],
      notes: " "
    })).toEqual({
      valid: false,
      error: "Approval notes are required when founder confirmations remain in metadata."
    });

    expect(validateFounderConfirmationApproval({
      decision: "approved",
      founderConfirmationNeeded: ["Logo chính thức cần founder xác nhận."],
      notes: "Founder confirmed logo and placement."
    })).toEqual({ valid: true });

    expect(validateFounderConfirmationApproval({
      decision: "rejected",
      founderConfirmationNeeded: ["Logo chính thức cần founder xác nhận."],
      notes: ""
    })).toEqual({ valid: true });
  });

  it("redacts local file URLs and Windows paths from QA response details", () => {
    const sanitized = sanitizeQaForResponse({
      passed: false,
      checks: [
        {
          name: "background_images_loaded",
          passed: false,
          details: "Failed URLs: file:///D:/brand-brain/assets/bg.png and D:\\brand-brain\\assets\\bg.png."
        }
      ]
    });
    const details = sanitized.checks[0]?.details ?? "";

    expect(sanitized.passed).toBe(false);
    expect(sanitized.checks[0]?.name).toBe("background_images_loaded");
    expect(sanitized.checks[0]?.passed).toBe(false);
    expect(details).toContain("[redacted-path]");
    expect(details).not.toContain("file://");
    expect(details).not.toContain("D:/");
    expect(details).not.toContain("D:\\");
  });
});
