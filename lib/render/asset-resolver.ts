import fs from "fs";
import path from "path";
import type { BrandAssetIndex } from "./types";

export class AssetResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetResolutionError";
  }
}

export function resolveAssetDataUrl(assetIndex: BrandAssetIndex, assetId: string): string {
  const asset = assetIndex.assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new AssetResolutionError(`Unknown asset id in render payload: ${assetId}`);
  }

  const repoRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd());
  const assetPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), asset.path);
  const relativeAssetPath = path.relative(repoRoot, assetPath);

  if (relativeAssetPath.startsWith("..") || path.isAbsolute(relativeAssetPath)) {
    throw new AssetResolutionError(`Asset path escapes repository root for asset id: ${assetId}`);
  }

  const mimeType = getImageMimeType(assetPath, assetId);
  let encoded: string;
  try {
    encoded = fs.readFileSync(assetPath).toString("base64");
  } catch {
    throw new AssetResolutionError(`Cannot read asset file for asset id: ${assetId}`);
  }

  return `data:${mimeType};base64,${encoded}`;
}

function getImageMimeType(assetPath: string, assetId: string): string {
  const extension = path.extname(assetPath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";

  throw new AssetResolutionError(`Unsupported image file type for asset id: ${assetId}`);
}
