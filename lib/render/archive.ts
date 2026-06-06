import { promises as fs } from "fs";
import path from "path";
import type { ApprovalRecord, RenderPayload, VisualQaResult } from "./types";

export interface RenderArchiveResult {
  outputDir: string;
}

export async function writeRenderArchive(input: {
  rootDir?: string;
  payload: RenderPayload;
  html: string;
  png: Buffer;
  brandCheckMarkdown: string;
  approval: ApprovalRecord;
  qa: VisualQaResult;
}): Promise<RenderArchiveResult> {
  const root = input.rootDir ?? path.join(process.cwd(), "outputs");
  const month = input.payload.job_id.slice(0, 7);
  const outputDir = path.join(root, "facebook-square", month, input.payload.job_id);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "render.html"), input.html, "utf8");
  await fs.writeFile(path.join(outputDir, "rendered.png"), input.png);
  await fs.writeFile(path.join(outputDir, "brand-check.md"), input.brandCheckMarkdown, "utf8");
  await fs.writeFile(path.join(outputDir, "metadata.json"), JSON.stringify({
    ...input.payload,
    qa: input.qa,
    archived_at: new Date().toISOString()
  }, null, 2), "utf8");
  await fs.writeFile(path.join(outputDir, "approval.json"), JSON.stringify(input.approval, null, 2), "utf8");

  return { outputDir };
}

export async function promoteApprovedRenderToFinal(outputDir: string): Promise<void> {
  const approvalPath = path.join(outputDir, "approval.json");
  const approval = JSON.parse(await fs.readFile(approvalPath, "utf8")) as ApprovalRecord;

  if (approval.status !== "approved") {
    throw new Error(`Cannot create final.png because approval status is ${approval.status}`);
  }

  await fs.copyFile(path.join(outputDir, "rendered.png"), path.join(outputDir, "final.png"));
}
