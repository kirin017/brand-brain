import path from "path";
import type { VisualQaResult } from "../../../../lib/render/types";

type ApprovalDecision = "approved" | "rejected";

export type ApprovalAccessDecision =
  | { allowed: true }
  | { allowed: false; status: 403; error: string };

export function toRelativeOutputPath(inputPath: string, repoRoot?: string): string {
  const absoluteRepoRoot = path.resolve(/*turbopackIgnore: true*/ repoRoot ?? process.cwd());
  const absoluteInputPath = path.resolve(/*turbopackIgnore: true*/ inputPath);
  const relativePath = path.relative(absoluteRepoRoot, absoluteInputPath);
  const normalizedPath = relativePath.split(path.sep).join("/");

  if (
    normalizedPath.length === 0 ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../") ||
    path.isAbsolute(normalizedPath)
  ) {
    throw new Error("Output path must resolve inside the repository root.");
  }

  if (normalizedPath !== "outputs" && !normalizedPath.startsWith("outputs/")) {
    throw new Error("Output path must resolve under outputs/.");
  }

  return normalizedPath;
}

export function checkApprovalRouteAccess(input: {
  hostHeader: string | null;
  requestToken: string | null;
  configuredToken?: string | null;
}): ApprovalAccessDecision {
  if (input.configuredToken && input.configuredToken.length > 0) {
    if (input.requestToken === input.configuredToken) {
      return { allowed: true };
    }

    return {
      allowed: false,
      status: 403,
      error: "Internal approval token is missing or invalid."
    };
  }

  if (isLocalhostHost(input.hostHeader)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    error: "Internal approval requires BYT_INTERNAL_API_TOKEN outside localhost."
  };
}

export function validateFounderConfirmationApproval(input: {
  decision: ApprovalDecision;
  founderConfirmationNeeded: string[];
  notes: string;
}): { valid: true } | { valid: false; error: string } {
  if (
    input.decision === "approved" &&
    input.founderConfirmationNeeded.length > 0 &&
    input.notes.trim().length === 0
  ) {
    return {
      valid: false,
      error: "Approval notes are required when founder confirmations remain in metadata."
    };
  }

  return { valid: true };
}

export function sanitizeQaForResponse(qa: VisualQaResult): VisualQaResult {
  return {
    passed: qa.passed,
    checks: qa.checks.map((check) => ({
      ...check,
      details: redactLocalPaths(check.details)
    }))
  };
}

function redactLocalPaths(value: string): string {
  return redactWindowsPaths(redactRepoRootPaths(redactFileUrls(value)));
}

function redactFileUrls(value: string): string {
  return value.replace(/file:\/\/\/?(?:[a-z]:)?[^\s'",)]+/gi, "[redacted-path]");
}

function redactRepoRootPaths(value: string): string {
  const repoRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd());
  const roots = Array.from(new Set([
    repoRoot,
    repoRoot.split(path.sep).join("/"),
    repoRoot.split(path.sep).join("\\")
  ].filter((root) => root.length > 0)));

  return roots.reduce((currentValue, root) => {
    const pattern = new RegExp(`${escapeRegExp(root)}(?:[\\\\/][^\\s'",)]*)?`, "gi");
    return currentValue.replace(pattern, "[redacted-path]");
  }, value);
}

function redactWindowsPaths(value: string): string {
  return value.replace(/\b[a-z]:[\\/][^\s'",)]+/gi, "[redacted-path]");
}

function isLocalhostHost(hostHeader: string | null): boolean {
  const host = normalizeHost(hostHeader);
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

function normalizeHost(hostHeader: string | null): string {
  const host = (hostHeader ?? "").trim().toLowerCase();
  if (host.startsWith("[")) {
    const endBracketIndex = host.indexOf("]");
    return endBracketIndex >= 0 ? host.slice(0, endBracketIndex + 1) : host;
  }
  if (host === "::1") return host;

  const portSeparatorIndex = host.indexOf(":");
  return portSeparatorIndex >= 0 ? host.slice(0, portSeparatorIndex) : host;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
