import { describe, expect, it } from "vitest";
import {
  getFacebookSquareTemplate,
  listFacebookSquareTemplates,
  renderFacebookSquareHtml
} from "./facebook-square-templates";

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
});
