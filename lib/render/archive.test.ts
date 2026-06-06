import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { writeRenderArchive } from "./archive";
import type { ApprovalRecord, RenderPayload, VisualQaResult } from "./types";

const payload: RenderPayload = {
  job_id: "2026-06-06-facebook-ban-mai-001",
  format: "facebook_square",
  template_id: "community-focus",
  campaign: "Ban Mai breakfast campaign",
  product_membership: "Ban Mai Thức Giấc",
  headline: "Bữa sáng lành hơn",
  supporting_copy: "Một lựa chọn gọn hơn.",
  cta: "Nhắn Bếp",
  assets: {},
  compliance: { risk_level: "Low", human_approval_required: false },
  founder_confirmation_needed: []
};

const approval: ApprovalRecord = {
  job_id: payload.job_id,
  status: "needs_human_approval",
  approver: "",
  decided_at: "",
  notes: "Pending approval."
};

const qa: VisualQaResult = {
  passed: true,
  checks: [{ name: "frame_size", passed: true, details: "1080x1080" }]
};

describe("render archive", () => {
  it("writes all render archive files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "byt-render-"));
    try {
      const result = await writeRenderArchive({
        rootDir: root,
        payload,
        html: "<html></html>",
        png: Buffer.from("png"),
        brandCheckMarkdown: "# Brand Check",
        approval,
        qa
      });

      expect(await readFile(path.join(result.outputDir, "render.html"), "utf8")).toBe("<html></html>");
      expect(await readFile(path.join(result.outputDir, "brand-check.md"), "utf8")).toBe("# Brand Check");
      expect(JSON.parse(await readFile(path.join(result.outputDir, "metadata.json"), "utf8")).job_id).toBe(payload.job_id);
      expect(JSON.parse(await readFile(path.join(result.outputDir, "approval.json"), "utf8")).status).toBe("needs_human_approval");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
