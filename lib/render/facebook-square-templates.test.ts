import { describe, expect, it } from "vitest";
import {
  getFacebookSquareTemplate,
  listFacebookSquareTemplates,
  renderFacebookSquareHtml
} from "./facebook-square-templates";
import { cssUrl } from "./html";

describe("facebook square templates", () => {
  it("lists the three initial templates", () => {
    expect(listFacebookSquareTemplates().map((template) => template.id)).toEqual([
      "product-focus",
      "membership-focus",
      "community-focus"
    ]);
  });

  it("defines required asset slots for product template", () => {
    expect(getFacebookSquareTemplate("product-focus").requiredAssetSlots).toEqual([
      "main_image"
    ]);
  });

  it("defines required asset slots for membership and community templates", () => {
    expect(getFacebookSquareTemplate("membership-focus").requiredAssetSlots).toEqual([
      "main_image"
    ]);
    expect(getFacebookSquareTemplate("community-focus").requiredAssetSlots).toEqual([]);
  });

  it("escapes text when rendering HTML", () => {
    const html = renderFacebookSquareHtml({
      templateId: "community-focus",
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
      templateId: "product-focus",
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
      "product-focus",
      "membership-focus",
      "community-focus"
    ]);
  });
});
