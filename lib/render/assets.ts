import { promises as fs } from "fs";
import path from "path";
import type { BrandAsset, BrandAssetIndex, RenderFormat } from "./types";

export async function loadAssetIndex(): Promise<BrandAssetIndex> {
  const filePath = path.join(process.cwd(), "brand-data", "assets.json");
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content) as BrandAssetIndex;
  const validation = validateAssetIndex(parsed);

  if (!validation.valid) {
    throw new Error(`Invalid BYT asset index: ${validation.errors.join("; ")}`);
  }

  return parsed;
}

export function validateAssetIndex(index: BrandAssetIndex): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!index.metadata?.schema_version) errors.push("metadata.schema_version is required");
  if (index.metadata?.language !== "vi") errors.push("metadata.language must be vi");
  if (!Array.isArray(index.assets)) errors.push("assets must be an array");

  for (const asset of index.assets ?? []) {
    if (!asset.id) errors.push("asset.id is required");
    if (!asset.type) errors.push(`${asset.id}: asset.type is required`);
    if (!asset.path) errors.push(`${asset.id}: asset.path is required`);
    if (!asset.status) errors.push(`${asset.id}: asset.status is required`);
    if (!Array.isArray(asset.allowed_channels)) errors.push(`${asset.id}: allowed_channels must be an array`);
    if (!Array.isArray(asset.allowed_formats)) errors.push(`${asset.id}: allowed_formats must be an array`);
    if (typeof asset.founder_confirmation_needed !== "boolean") {
      errors.push(`${asset.id}: founder_confirmation_needed must be boolean`);
    }
  }

  return { valid: errors.length === 0, errors };
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
