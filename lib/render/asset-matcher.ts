import { findApprovedAsset } from "./assets";
import type { AssetType, BrandAsset, BrandAssetIndex, RenderFormat } from "./types";

export interface AssetMatchRequest {
  slot: "logo" | "main_image" | "background" | "qr";
  type: AssetType;
  channel: string;
  format: RenderFormat;
  requiredTags: string[];
}

const slotAssetTypes = {
  logo: "logo",
  main_image: "product_photo",
  background: "background",
  qr: "qr"
} as const satisfies Record<AssetMatchRequest["slot"], AssetType>;

export function chooseApprovedAssetIdForSlot(
  index: BrandAssetIndex,
  request: AssetMatchRequest
): string | undefined {
  if (request.type !== slotAssetTypes[request.slot]) return undefined;

  const requiredTags = request.requiredTags.map(normalizeRenderTag).filter(Boolean);
  const candidates = index.assets.filter((asset) => {
    if (asset.type !== request.type) return false;
    if (!findApprovedAsset(index, asset.id, request.channel, request.format)) return false;
    if (requiredTags.length === 0) return true;
    return assetHasAllTags(asset, requiredTags);
  });

  return candidates[0]?.id;
}

export function assetHasAllTags(asset: BrandAsset, requiredTags: string[]): boolean {
  const tags = collectAssetTags(asset);
  return requiredTags.every((tag) => tags.has(normalizeRenderTag(tag)));
}

export function collectAssetTags(asset: BrandAsset): Set<string> {
  return new Set([
    ...(asset.product_tags ?? []),
    ...(asset.campaign_tags ?? []),
    ...(asset.visual_tags ?? [])
  ].map(normalizeRenderTag).filter(Boolean));
}

export function normalizeRenderTag(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
