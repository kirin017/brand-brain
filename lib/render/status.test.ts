import { describe, expect, it } from "vitest";
import {
  canExportFinal,
  canRender,
  nextStatusAfterTextCheck,
  type RenderJobStatus
} from "./status";

describe("render status gates", () => {
  it("allows rendering only from ready_for_render", () => {
    expect(canRender("ready_for_render")).toBe(true);
    expect(canRender("blocked_for_compliance")).toBe(false);
    expect(canRender("blocked_for_missing_asset")).toBe(false);
  });

  it("allows final export only from approved", () => {
    expect(canExportFinal("approved")).toBe(true);
    expect(canExportFinal("rendered")).toBe(false);
    expect(canExportFinal("needs_human_approval")).toBe(false);
  });

  it("maps high compliance risk to blocked_for_compliance", () => {
    const status: RenderJobStatus = nextStatusAfterTextCheck({
      complianceRisk: "High",
      missingRequiredAssets: [],
      unresolvedFounderConfirmations: []
    });

    expect(status).toBe("blocked_for_compliance");
  });

  it("maps missing required assets to blocked_for_missing_asset", () => {
    const status = nextStatusAfterTextCheck({
      complianceRisk: "Low",
      missingRequiredAssets: ["main_image"],
      unresolvedFounderConfirmations: []
    });

    expect(status).toBe("blocked_for_missing_asset");
  });

  it("requires human approval when founder confirmations remain", () => {
    const status = nextStatusAfterTextCheck({
      complianceRisk: "Low",
      missingRequiredAssets: [],
      unresolvedFounderConfirmations: ["Logo chính thức"]
    });

    expect(status).toBe("needs_human_approval");
  });
});
