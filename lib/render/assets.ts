import { promises as fs } from "fs";
import path from "path";
import type { BrandAsset, BrandAssetIndex, RenderFormat } from "./types";

const allowedRootKeys = new Set(["metadata", "assets"]);

const allowedMetadataKeys = new Set([
  "schema_version",
  "language",
  "status",
  "notes"
]);

const assetTypes = [
  "logo",
  "product_photo",
  "background",
  "lifestyle_reference",
  "qr",
  "design_token"
] as const;

const assetStatuses = [
  "draft",
  "needs_founder_confirmation",
  "approved",
  "restricted",
  "do_not_use"
] as const;

const allowedAssetKeys = new Set([
  "id",
  "type",
  "path",
  "status",
  "allowed_channels",
  "allowed_formats",
  "usage_notes",
  "founder_confirmation_needed"
]);

export async function loadAssetIndex(): Promise<BrandAssetIndex> {
  const filePath = path.join(process.cwd(), "brand-data", "assets.json");
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content) as unknown;
  const validation = validateAssetIndex(parsed);

  if (!validation.valid) {
    throw new Error(`Invalid BYT asset index: ${validation.errors.join("; ")}`);
  }

  return parsed as BrandAssetIndex;
}

export function validateAssetIndex(index: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(index)) {
    return {
      valid: false,
      errors: ["asset index must be an object"]
    };
  }

  for (const key of Object.keys(index)) {
    if (!allowedRootKeys.has(key)) {
      errors.push(`unsupported root field ${key}`);
    }
  }

  const metadata = index.metadata;
  if (!isRecord(metadata)) {
    errors.push("metadata must be an object");
  } else {
    for (const key of Object.keys(metadata)) {
      if (!allowedMetadataKeys.has(key)) {
        errors.push(`metadata: unsupported field ${key}`);
      }
    }

    if (typeof metadata.schema_version !== "string") {
      errors.push("metadata.schema_version must be a string");
    }
    if (metadata.language !== "vi") errors.push("metadata.language must be vi");
    if (typeof metadata.status !== "string") {
      errors.push("metadata.status must be a string");
    }
    if (metadata.notes !== undefined && typeof metadata.notes !== "string") {
      errors.push("metadata.notes must be a string");
    }
  }

  const assets = Array.isArray(index.assets) ? index.assets : [];
  if (!Array.isArray(index.assets)) errors.push("assets must be an array");

  for (const [assetIndex, asset] of assets.entries()) {
    if (!isRecord(asset)) {
      errors.push(`asset[${assetIndex}] must be an object`);
      continue;
    }

    const assetId = typeof asset.id === "string" ? asset.id : `asset[${assetIndex}]`;

    for (const key of Object.keys(asset)) {
      if (!allowedAssetKeys.has(key)) {
        errors.push(`${assetId}: unsupported asset field ${key}`);
      }
    }

    if (typeof asset.id !== "string") errors.push(`${assetId}: asset.id must be a string`);
    if (!isAllowedValue(asset.type, assetTypes)) {
      errors.push(`${assetId}: asset.type must be one of ${assetTypes.join(", ")}`);
    }
    if (typeof asset.path !== "string") errors.push(`${assetId}: asset.path must be a string`);
    if (!isAllowedValue(asset.status, assetStatuses)) {
      errors.push(`${assetId}: asset.status must be one of ${assetStatuses.join(", ")}`);
    }
    if (!Array.isArray(asset.allowed_channels)) errors.push(`${assetId}: allowed_channels must be an array`);
    if (Array.isArray(asset.allowed_channels) && !asset.allowed_channels.every((channel) => typeof channel === "string")) {
      errors.push(`${assetId}: allowed_channels must contain strings only`);
    }
    if (!Array.isArray(asset.allowed_formats)) errors.push(`${assetId}: allowed_formats must be an array`);
    if (Array.isArray(asset.allowed_formats) && !asset.allowed_formats.every((format) => format === "facebook_square")) {
      errors.push(`${assetId}: allowed_formats must contain facebook_square only`);
    }
    if (typeof asset.usage_notes !== "string") errors.push(`${assetId}: usage_notes must be a string`);
    if (typeof asset.founder_confirmation_needed !== "boolean") {
      errors.push(`${assetId}: founder_confirmation_needed must be boolean`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && allowedValues.includes(value as T);
}

export function findApprovedAsset(
  index: BrandAssetIndex,
  assetId: string | undefined,
  channel: string,
  format: RenderFormat
): BrandAsset | null {
  if (!assetId) return null;

  const asset = index.assets.find((item) => item.id === assetId);
  if (!asset) return null;
  if (asset.status !== "approved") return null;
  if (asset.founder_confirmation_needed) return null;
  if (!asset.allowed_channels.includes(channel)) return null;
  if (!asset.allowed_formats.includes(format)) return null;

  return asset;
}

export function listMissingRequiredAssets(
  index: BrandAssetIndex,
  input: {
    requiredSlots: string[];
    assetIdsBySlot: Record<string, string | undefined>;
    channel: string;
    format: RenderFormat;
  }
): string[] {
  return input.requiredSlots.filter((slot) => {
    const asset = findApprovedAsset(
      index,
      input.assetIdsBySlot[slot],
      input.channel,
      input.format
    );
    return asset === null;
  });
}
