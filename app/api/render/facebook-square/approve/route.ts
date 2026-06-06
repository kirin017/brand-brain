import { promises as fs } from "fs";
import path from "path";
import {
  promoteApprovedRenderToFinal,
  resolveRenderArchivePath
} from "../../../../../lib/render/archive";
import type { ApprovalRecord, RenderPayload } from "../../../../../lib/render/types";
import {
  checkApprovalRouteAccess,
  toRelativeOutputPath,
  validateFounderConfirmationApproval
} from "../route-helpers";

export const runtime = "nodejs";

type ApprovalDecision = "approved" | "rejected";

interface ApprovalRequestBody {
  job_id: string;
  approver: string;
  notes: string;
  decision: ApprovalDecision;
}

export async function POST(request: Request): Promise<Response> {
  const access = checkApprovalRouteAccess({
    hostHeader: getRequestHost(request),
    requestToken: request.headers.get("x-byt-internal-token"),
    configuredToken: process.env.BYT_INTERNAL_API_TOKEN
  });
  if (!access.allowed) {
    return Response.json(
      { status: "forbidden", error: access.error },
      { status: access.status }
    );
  }

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

    if (isFinalApprovalStatus(currentApproval.status)) {
      return Response.json(
        {
          status: "already_decided",
          error: `Render job is already ${currentApproval.status}.`,
          job_id: validation.input.job_id
        },
        { status: 409 }
      );
    }

    const founderConfirmationValidation = validateFounderConfirmationApproval({
      decision: validation.input.decision,
      founderConfirmationNeeded: metadata.founder_confirmation_needed,
      notes: validation.input.notes
    });
    if (!founderConfirmationValidation.valid) {
      return Response.json(
        { status: "invalid_request", error: founderConfirmationValidation.error },
        { status: 400 }
      );
    }

    const finalPath = path.join(archive.outputDir, "final.png");
    if (validation.input.decision === "rejected" && await fileExists(finalPath)) {
      return Response.json(
        {
          status: "final_png_exists",
          error: "Cannot reject a render job after final.png exists.",
          job_id: validation.input.job_id,
          final_png: toRelativeOutputPath(finalPath)
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

    await writeApprovalRecord(approvalPath, approval);

    if (validation.input.decision === "approved") {
      try {
        const promoted = await promoteApprovedRenderToFinal({ jobId: validation.input.job_id });

        return Response.json({
          status: validation.input.decision,
          job_id: validation.input.job_id,
          final_png: toRelativeOutputPath(promoted.finalPath)
        });
      } catch (error) {
        try {
          await writeApprovalRecord(approvalPath, currentApproval);
        } catch (restoreError) {
          return Response.json(
            {
              status: "promotion_failed_restore_failed",
              error: "Could not promote approved render and could not restore previous approval state.",
              restore_error: "Approval restore failed."
            },
            { status: 500 }
          );
        }

        return Response.json(
          { status: "promotion_failed", error: "Could not promote approved render to final.png." },
          { status: 500 }
        );
      }
    }

    return Response.json({
      status: validation.input.decision,
      job_id: validation.input.job_id,
      final_png: null
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
      { status: "internal_error", error: "Internal approval error." },
      { status: 500 }
    );
  }
}

function getRequestHost(request: Request): string | null {
  const hostHeader = request.headers.get("host");
  if (hostHeader) return hostHeader;

  try {
    return new URL(request.url).host;
  } catch {
    return null;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeApprovalRecord(filePath: string, approval: ApprovalRecord): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(approval, null, 2), "utf8");
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

  if (typeof body.approver !== "string" || body.approver.trim().length === 0) {
    return { valid: false, error: "approver must be a non-empty string." };
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
      job_id: body.job_id.trim(),
      approver: body.approver.trim(),
      notes: body.notes,
      decision: body.decision
    }
  };
}

function isFinalApprovalStatus(status: ApprovalRecord["status"]): boolean {
  return status === "approved" || status === "rejected";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
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
