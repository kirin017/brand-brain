import { promises as fs } from "fs";
import path from "path";
import {
  promoteApprovedRenderToFinal,
  resolveRenderArchivePath
} from "../../../../../lib/render/archive";
import type { ApprovalRecord, RenderPayload } from "../../../../../lib/render/types";

export const runtime = "nodejs";

type ApprovalDecision = "approved" | "rejected";

interface ApprovalRequestBody {
  job_id: string;
  approver: string;
  notes: string;
  decision: ApprovalDecision;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "invalid_request", error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const validation = validateApprovalRequest(body);
  if (!validation.valid) {
    return Response.json(
      { status: "invalid_request", error: validation.error },
      { status: 400 }
    );
  }

  try {
    const archive = resolveRenderArchivePath({ jobId: validation.input.job_id });
    const metadataPath = path.join(archive.outputDir, "metadata.json");
    const approvalPath = path.join(archive.outputDir, "approval.json");
    const [metadata, currentApproval] = await Promise.all([
      readJsonFile<RenderPayload>(metadataPath),
      readJsonFile<ApprovalRecord>(approvalPath)
    ]);

    if (metadata.job_id !== validation.input.job_id) {
      return Response.json(
        {
          status: "archive_mismatch",
          error: `metadata job_id ${metadata.job_id} does not match requested job_id ${validation.input.job_id}`
        },
        { status: 409 }
      );
    }

    if (currentApproval.job_id !== validation.input.job_id) {
      return Response.json(
        {
          status: "archive_mismatch",
          error: `approval job_id ${currentApproval.job_id} does not match requested job_id ${validation.input.job_id}`
        },
        { status: 409 }
      );
    }

    const approval: ApprovalRecord = {
      job_id: validation.input.job_id,
      status: validation.input.decision,
      approver: validation.input.approver,
      decided_at: new Date().toISOString(),
      notes: validation.input.notes
    };

    await fs.writeFile(approvalPath, JSON.stringify(approval, null, 2), "utf8");

    const finalPng = validation.input.decision === "approved"
      ? (await promoteApprovedRenderToFinal({ jobId: validation.input.job_id })).finalPath
      : null;

    return Response.json({
      status: validation.input.decision,
      job_id: validation.input.job_id,
      final_png: finalPng
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return Response.json(
        { status: "not_found", error: "Render archive was not found for the requested job_id." },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes("Invalid job_id")) {
      return Response.json(
        { status: "invalid_request", error: error.message },
        { status: 400 }
      );
    }

    return Response.json(
      { status: "internal_error", error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function validateApprovalRequest(body: unknown):
  | { valid: true; input: ApprovalRequestBody }
  | { valid: false; error: string } {
  if (!isRecord(body)) {
    return { valid: false, error: "Request body must be an object." };
  }

  if (typeof body.job_id !== "string" || body.job_id.trim().length === 0) {
    return { valid: false, error: "job_id must be a non-empty string." };
  }

  if (typeof body.approver !== "string") {
    return { valid: false, error: "approver must be a string." };
  }

  if (typeof body.notes !== "string") {
    return { valid: false, error: "notes must be a string." };
  }

  if (!isApprovalDecision(body.decision)) {
    return { valid: false, error: "decision must be approved or rejected." };
  }

  return {
    valid: true,
    input: {
      job_id: body.job_id,
      approver: body.approver,
      notes: body.notes,
      decision: body.decision
    }
  };
}

function isApprovalDecision(value: unknown): value is ApprovalDecision {
  return value === "approved" || value === "rejected";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
