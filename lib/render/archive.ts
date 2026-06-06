import { promises as fs } from "fs";
import path from "path";
import type { ApprovalRecord, RenderPayload, VisualQaResult } from "./types";

const JOB_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{8}$/;

export interface RenderArchiveResult {
  outputDir: string;
}

export interface PromoteApprovedRenderResult {
  finalPath: string;
}

function assertSafeJobId(jobId: string): void {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new Error(`Invalid job_id: ${jobId}`);
  }
}

export function resolveRenderArchivePath(input: { rootDir?: string; jobId: string }): RenderArchiveResult {
  assertSafeJobId(input.jobId);

  const root = input.rootDir
    ? path.resolve(/* turbopackIgnore: true */ input.rootDir)
    : path.resolve(process.cwd(), "outputs");
  const month = input.jobId.slice(0, 7);
  const outputDir = path.resolve(root, "facebook-square", month, input.jobId);
  const relative = path.relative(root, outputDir);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Resolved outputDir escapes archive root for job_id: ${input.jobId}`);
  }

  return { outputDir };
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
  assertSafeJobId(input.payload.job_id);

  if (input.approval.job_id !== input.payload.job_id) {
    throw new Error(`approval job_id ${input.approval.job_id} does not match payload job_id ${input.payload.job_id}`);
  }

  const { outputDir } = resolveRenderArchivePath({
    rootDir: input.rootDir,
    jobId: input.payload.job_id
  });

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

export async function promoteApprovedRenderToFinal(input: {
  rootDir?: string;
  jobId: string;
}): Promise<PromoteApprovedRenderResult> {
  const { outputDir } = resolveRenderArchivePath(input);
  const approvalPath = path.join(outputDir, "approval.json");
  const metadataPath = path.join(outputDir, "metadata.json");
  const approval = JSON.parse(await fs.readFile(approvalPath, "utf8")) as ApprovalRecord;
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as RenderPayload;

  if (metadata.job_id !== input.jobId) {
    throw new Error(`metadata job_id ${metadata.job_id} does not match requested job_id ${input.jobId}`);
  }

  if (approval.job_id !== metadata.job_id) {
    throw new Error(`approval job_id ${approval.job_id} does not match metadata job_id ${metadata.job_id}`);
  }

  if (approval.status !== "approved") {
    throw new Error(`Cannot create final.png because approval status is ${approval.status}`);
  }

  const finalPath = path.join(outputDir, "final.png");
  await fs.copyFile(path.join(outputDir, "rendered.png"), finalPath);

  return { finalPath };
}
