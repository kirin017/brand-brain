import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveAssetDataUrl } from "./asset-resolver";
import type { BrandAssetIndex } from "./types";

const testDirs: string[] = [];

afterEach(async () => {
  await Promise.all(testDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("asset data URL resolver", () => {
  it("returns a PNG data URL for a local PNG under the repository root", async () => {
    const { assetPath, root } = await createTempAsset("asset.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    testDirs.push(root);

    const dataUrl = resolveAssetDataUrl(createAssetIndex(assetPath), "asset-1");

    expect(dataUrl).toBe("data:image/png;base64,iVBORw==");
  });

  it("rejects unsupported image file types", async () => {
    const { assetPath, root } = await createTempAsset("asset.gif", Buffer.from("gif"));
    testDirs.push(root);

    expect(() => resolveAssetDataUrl(createAssetIndex(assetPath), "asset-1"))
      .toThrow("Unsupported image file type for asset id: asset-1");
  });

  it("rejects asset paths that escape the repository root", () => {
    const escapingPath = path.join("..", "__outside-byt-asset.png");

    expect(() => resolveAssetDataUrl(createAssetIndex(escapingPath), "asset-1"))
      .toThrow("Asset path escapes repository root for asset id: asset-1");
  });
});

async function createTempAsset(fileName: string, content: Buffer): Promise<{ assetPath: string; root: string }> {
  const root = path.join(process.cwd(), `.tmp-asset-resolver-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(root, { recursive: true });
  const filePath = path.join(root, fileName);
  await writeFile(filePath, content);

  return {
    assetPath: path.relative(process.cwd(), filePath),
    root
  };
}

function createAssetIndex(assetPath: string): BrandAssetIndex {
  return {
    metadata: {
      schema_version: "0.1.0",
      language: "vi",
      status: "draft"
    },
    assets: [
      {
        id: "asset-1",
        type: "product_photo",
        path: assetPath,
        status: "approved",
        allowed_channels: ["Facebook"],
        allowed_formats: ["facebook_square"],
        usage_notes: "Test asset.",
        founder_confirmation_needed: false
      }
    ]
  };
}
