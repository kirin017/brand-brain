import { describe, expect, it } from "vitest";
import {
  getFacebookSquareTemplate,
  listFacebookSquareTemplates,
  renderFacebookSquareHtml
} from "./facebook-square-templates";
import { cssUrl } from "./html";

describe("facebook square templates", () => {
  it("lists the Phase 1 BYT context templates", () => {
    expect(listFacebookSquareTemplates().map((template) => template.id)).toEqual([
      "ban-mai-breakfast",
      "giot-lanh-membership",
      "product-focus-drink",
      "an-lanh-song-khoe-community",
      "zalo-community",
      "sale-ctv-recruitment",
      "connected-point-posm",
      "brand-alliance"
    ]);
  });

  it("requires real product images only for product-led templates", () => {
    expect(getFacebookSquareTemplate("ban-mai-breakfast").requiredAssetSlots).toEqual(["main_image"]);
    expect(getFacebookSquareTemplate("product-focus-drink").requiredAssetSlots).toEqual(["main_image"]);
    expect(getFacebookSquareTemplate("giot-lanh-membership").requiredAssetSlots).toEqual([]);
    expect(getFacebookSquareTemplate("an-lanh-song-khoe-community").requiredAssetSlots).toEqual([]);
    expect(getFacebookSquareTemplate("zalo-community").requiredAssetSlots).toEqual([]);
    expect(getFacebookSquareTemplate("sale-ctv-recruitment").requiredAssetSlots).toEqual([]);
    expect(getFacebookSquareTemplate("connected-point-posm").requiredAssetSlots).toEqual([]);
    expect(getFacebookSquareTemplate("brand-alliance").requiredAssetSlots).toEqual([]);
  });

  it("renders template-specific frame classes", () => {
    const html = renderFacebookSquareHtml({
      templateId: "an-lanh-song-khoe-community",
      templateVariant: "A",
      headline: "Ăn lành bắt đầu từ một bữa nhỏ",
      supportingCopy: "Một gợi ý dễ làm cho ngày bận rộn.",
      cta: "Lưu lại cho hôm nay",
      brandName: "Bếp Yêu Thương",
      assets: {}
    });

    expect(html).toContain("frame-an-lanh-song-khoe-community");
    expect(html).toContain("layout-community");
    expect(html).toContain("variant-a");
    expect(html).toContain(".layout-community .content-grid");
    expect(html).toContain(".layout-community h1");
    expect(html).not.toContain(".frame-community-focus");
  });

  it("escapes text when rendering HTML", () => {
    const html = renderFacebookSquareHtml({
      templateId: "an-lanh-song-khoe-community",
      templateVariant: "A",
      headline: "Ăn lành <script>",
      supportingCopy: "Một lựa chọn nhỏ & dễ duy trì.",
      cta: "Nhắn Bếp",
      brandName: "Bếp Yêu Thương",
      assets: {}
    });

    expect(html).toContain("Ăn lành &lt;script&gt;");
    expect(html).toContain("Một lựa chọn nhỏ &amp; dễ duy trì.");
    expect(html).not.toContain("<script>");
  });

  it("renders main image from asset slot names", () => {
    const html = renderFacebookSquareHtml({
      templateId: "ban-mai-breakfast",
      templateVariant: "A",
      headline: "Bữa ăn lành hơn",
      supportingCopy: "Một lựa chọn nhỏ cho ngày bận rộn.",
      cta: "Nhắn Bếp",
      brandName: "Bếp Yêu Thương",
      assets: {
        main_image: "assets/products/bowl.png"
      }
    });

    expect(html).toContain('src="assets/products/bowl.png"');
    expect(html).not.toContain("Ăn lành. Uống sạch. Sống yêu thương.");
  });

  it("escapes double quotes in css urls", () => {
    expect(cssUrl('assets/backgrounds/bg"hero.png')).toBe(
      'url("assets/backgrounds/bg%22hero.png")'
    );
  });

  it("rejects unsafe css url inputs", () => {
    for (const path of [
      "assets\\backgrounds\\bg.png",
      "assets/backgrounds/bg\nnext.png",
      "assets/backgrounds/bg</style.png"
    ]) {
      expect(() => cssUrl(path)).toThrow("Unsafe CSS URL path");
    }
  });

  it("returns a list copy that cannot mutate the internal registry", () => {
    const listed = listFacebookSquareTemplates();
    listed.pop();

    expect(listFacebookSquareTemplates().map((template) => template.id)).toEqual([
      "ban-mai-breakfast",
      "giot-lanh-membership",
      "product-focus-drink",
      "an-lanh-song-khoe-community",
      "zalo-community",
      "sale-ctv-recruitment",
      "connected-point-posm",
      "brand-alliance"
    ]);
  });
});
