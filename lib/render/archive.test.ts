import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { promoteApprovedRenderToFinal, writeRenderArchive } from "./archive";
import type { ApprovalRecord, RenderPayload, VisualQaResult } from "./types";

const payload: RenderPayload = {
  job_id: "2026-06-06-facebook-ban-mai-00000001",
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

async function withTempRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "byt-render-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("render archive", () => {
  it("writes all render archive files", async () => {
    await withTempRoot(async (root) => {
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
      expect(await readFile(path.join(result.outputDir, "rendered.png"))).toEqual(Buffer.from("png"));
      expect(await readFile(path.join(result.outputDir, "brand-check.md"), "utf8")).toBe("# Brand Check");
      expect(JSON.parse(await readFile(path.join(result.outputDir, "metadata.json"), "utf8")).job_id).toBe(payload.job_id);
      expect(JSON.parse(await readFile(path.join(result.outputDir, "approval.json"), "utf8")).status).toBe("needs_human_approval");
    });
  });

  it("promotes approved rendered png to final png", async () => {
    await withTempRoot(async (root) => {
      const approved: ApprovalRecord = {
        ...approval,
        status: "approved",
        approver: "Founder",
        decided_at: "2026-06-06T16:00:00.000Z",
        notes: "Approved."
      };
      const archive = await writeRenderArchive({
        rootDir: root,
        payload,
        html: "<html></html>",
        png: Buffer.from("approved-png"),
        brandCheckMarkdown: "# Brand Check",
        approval: approved,
        qa
      });

      const result = await promoteApprovedRenderToFinal({ rootDir: root, jobId: payload.job_id });

      expect(result.finalPath).toBe(path.join(archive.outputDir, "final.png"));
      expect(await readFile(result.finalPath)).toEqual(Buffer.from("approved-png"));
    });
  });

  it.each(["needs_human_approval", "rejected"] as const)("blocks promotion when approval status is %s", async (status) => {
    await withTempRoot(async (root) => {
      await writeRenderArchive({
        rootDir: root,
        payload,
        html: "<html></html>",
        png: Buffer.from("png"),
        brandCheckMarkdown: "# Brand Check",
        approval: { ...approval, status },
        qa
      });

      await expect(promoteApprovedRenderToFinal({ rootDir: root, jobId: payload.job_id }))
        .rejects.toThrow(`Cannot create final.png because approval status is ${status}`);
    });
  });

  it("rejects approval and payload job id mismatch when writing archive", async () => {
    await withTempRoot(async (root) => {
      await expect(writeRenderArchive({
        rootDir: root,
        payload,
        html: "<html></html>",
        png: Buffer.from("png"),
        brandCheckMarkdown: "# Brand Check",
        approval: { ...approval, job_id: "2026-06-06-facebook-other-00000002" },
        qa
      })).rejects.toThrow(/approval job_id/i);
    });
  });

  it("rejects approval and metadata job id mismatch when promoting", async () => {
    await withTempRoot(async (root) => {
      const approved: ApprovalRecord = {
        ...approval,
        status: "approved",
        approver: "Founder",
        decided_at: "2026-06-06T16:00:00.000Z",
        notes: "Approved."
      };
      const archive = await writeRenderArchive({
        rootDir: root,
        payload,
        html: "<html></html>",
        png: Buffer.from("png"),
        brandCheckMarkdown: "# Brand Check",
        approval: approved,
        qa
      });
      await writeFile(
        path.join(archive.outputDir, "approval.json"),
        JSON.stringify({ ...approved, job_id: "2026-06-06-facebook-other-00000002" }, null, 2),
        "utf8"
      );

      await expect(promoteApprovedRenderToFinal({ rootDir: root, jobId: payload.job_id }))
        .rejects.toThrow(/approval job_id/i);
    });
  });

  it.each([
    "2026-06-06-facebook-../evil",
    "2026-06-06-facebook-evil\\x"
  ])("rejects unsafe job id %s", async (jobId) => {
    await withTempRoot(async (root) => {
      await expect(writeRenderArchive({
        rootDir: root,
        payload: { ...payload, job_id: jobId },
        html: "<html></html>",
        png: Buffer.from("png"),
        brandCheckMarkdown: "# Brand Check",
        approval: { ...approval, job_id: jobId },
        qa
      })).rejects.toThrow(/job_id/i);
    });
  });
});
