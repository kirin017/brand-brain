import type {
  BrandCheckerScores,
  BrandDataBundle,
  ComplianceCheck,
  ComplianceRisk,
  FormOptions,
  GeneratedOutput,
  GenerationInput,
  JsonRecord,
  OutputType,
  RiskSensitivity,
  SelectOption
} from "./types";

const outputTypeLabels: Record<OutputType, string> = {
  daily_design_brief: "Daily design brief",
  facebook_post_brief: "Facebook post brief",
  zalo_group_content: "Zalo group content",
  membership_campaign_content: "Membership campaign content",
  sales_script: "Sales script",
  connected_point_pitch: "Connected point pitch",
  brand_alliance_invitation: "Brand alliance invitation",
  brand_checker_report: "Brand Checker report"
};

const channelAliases: Record<string, string> = {
  Facebook: "facebook",
  "Zalo group": "zalo_group",
  "Zalo OA": "zalo_oa",
  "TikTok/Reels": "tiktok_reels",
  POSM: "posm",
  "Sale kit": "sale_kit",
  "Connected point": "connected_point_material",
  "Alliance partner": "partner_proposal"
};

const sourceFilesUsed = [
  "BRAND_CONTEXT_SUMMARY.md",
  "brand-data/brand-brain.json",
  "brand-data/products.json",
  "brand-data/memberships.json",
  "brand-data/customer-segments.json",
  "brand-data/channels.json",
  "brand-data/campaigns.json",
  "brand-data/voice-rules.json",
  "brand-data/compliance-rules.json",
  "brand-data/brand-check-rubric.json",
  "templates/design-brief-template.md",
  "templates/daily-design-request-template.md",
  "templates/zalo-post-template.md",
  "templates/sales-follow-up-template.md",
  "templates/zalo-post-template.md",
  "templates/point-opening-pitch-template.md",
  "templates/alliance-partner-invitation-template.md"
];

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampScore(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score)));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getMemberships(data: BrandDataBundle): JsonRecord[] {
  return asArray<JsonRecord>(data.memberships.memberships);
}

function getProducts(data: BrandDataBundle): JsonRecord[] {
  const categories = asRecord(data.products.product_categories);
  return Object.values(categories).flatMap((category) => {
    const categoryRecord = asRecord(category);
    return [
      ...asArray<JsonRecord>(categoryRecord.products),
      ...asArray<JsonRecord>(categoryRecord.services)
    ];
  });
}

function getCampaigns(data: BrandDataBundle): JsonRecord[] {
  return asArray<JsonRecord>(data.campaigns.campaign_templates);
}

function getSegments(data: BrandDataBundle): Record<string, JsonRecord> {
  return asRecord(data.customerSegments.segments) as Record<string, JsonRecord>;
}

function findMembership(data: BrandDataBundle, selected: string): JsonRecord | null {
  const normalized = normalizeText(selected);
  return (
    getMemberships(data).find((membership) => {
      const name = normalizeText(asString(membership.name));
      const id = normalizeText(asString(membership.id));
      return name === normalized || name.includes(normalized) || normalized.includes(name) || id.includes(normalized);
    }) ?? null
  );
}

function findProduct(data: BrandDataBundle, selected: string): JsonRecord | null {
  const normalized = normalizeText(selected);
  return (
    getProducts(data).find((product) => {
      const name = normalizeText(asString(product.name));
      const slug = normalizeText(asString(product.slug));
      return name === normalized || name.includes(normalized) || normalized.includes(name) || slug.includes(normalized);
    }) ?? null
  );
}

function findCampaign(data: BrandDataBundle, selected: string): JsonRecord | null {
  const normalized = normalizeText(selected);
  return (
    getCampaigns(data).find((campaign) => {
      const name = normalizeText(asString(campaign.name));
      const id = normalizeText(asString(campaign.id));
      return name === normalized || name.includes(normalized) || normalized.includes(name) || id.includes(normalized);
    }) ?? null
  );
}

function findAudience(data: BrandDataBundle, selected: string): JsonRecord {
  const segments = getSegments(data);
  if (segments[selected]) return segments[selected];
  const normalized = normalizeText(selected);
  return (
    Object.values(segments).find((segment) => normalizeText(asString(segment.name)).includes(normalized)) ??
    {}
  );
}

function findChannel(data: BrandDataBundle, selected: string): JsonRecord {
  const channels = asRecord(data.channels.channels) as Record<string, JsonRecord>;
  const key = channelAliases[selected] ?? selected;
  return channels[key] ?? {};
}

function option(value: string, label = value): SelectOption {
  return { value, label };
}

export function getFormOptions(data: BrandDataBundle): FormOptions {
  const productNames = getProducts(data).map((product) => asString(product.name));
  const membershipNames = getMemberships(data).map((membership) => asString(membership.name));

  return {
    outputTypes: [
      option("daily_design_brief", "Daily design brief"),
      option("facebook_post_brief", "Facebook post brief"),
      option("zalo_group_content", "Zalo group content"),
      option("membership_campaign_content", "Membership campaign content"),
      option("sales_script", "Sales script"),
      option("connected_point_pitch", "Connected point pitch"),
      option("brand_alliance_invitation", "Brand alliance invitation"),
      option("brand_checker_report", "Brand Checker report")
    ],
    audiences: Object.entries(getSegments(data)).map(([key, segment]) =>
      option(key, asString(segment.name, key))
    ),
    productMemberships: [
      ...membershipNames.map((name) => option(name)),
      ...productNames.map((name) => option(name)),
      option("Khác / nhập trong ghi chú")
    ],
    campaigns: [
      ...getCampaigns(data).map((campaign) => option(asString(campaign.name))),
      option("Khác / chưa rõ")
    ],
    channels: [
      option("Facebook"),
      option("Zalo group"),
      option("Zalo OA"),
      option("TikTok/Reels"),
      option("POSM"),
      option("Sale kit"),
      option("Connected point"),
      option("Alliance partner")
    ],
    formats: [
      option("Facebook square post"),
      option("Facebook story"),
      option("Zalo banner"),
      option("TikTok/Reel cover"),
      option("POSM poster"),
      option("QR point-of-sale card"),
      option("Membership post"),
      option("Sale/CTV recruitment post"),
      option("Leader recruitment post"),
      option("Connected point proposal visual"),
      option("Brand alliance invitation visual")
    ],
    tones: [
      option("Ấm áp, thực tế, không phán xét"),
      option("Ngắn gọn, thân mật, cộng đồng"),
      option("Chuyên nghiệp, minh bạch, hợp tác"),
      option("Tư vấn nhẹ nhàng, không ép mua"),
      option("Rõ ràng, có checklist, dễ đào tạo")
    ],
    riskSensitivities: [
      option("conservative", "Conservative"),
      option("balanced", "Balanced"),
      option("sales-oriented", "Sales-oriented")
    ]
  };
}

export function getInitialInput(data: BrandDataBundle): GenerationInput {
  const firstMembership = asString(getMemberships(data)[0]?.name, "Giọt Lành Yêu Thương");
  const firstCampaign = asString(getCampaigns(data)[0]?.name, "Giọt Lành membership campaign");

  return {
    outputType: "daily_design_brief",
    goal: "Tạo nội dung BYT giúp khách bắt đầu một lựa chọn ăn/uống lành hơn và kết nối vào cộng đồng.",
    audience: "office_workers",
    productMembership: firstMembership,
    campaign: firstCampaign,
    channel: "Facebook",
    format: "Facebook square post",
    offer: "",
    cta: "Nhắn Bếp để được gợi ý.",
    tone: "Ấm áp, thực tế, không phán xét",
    notes: "",
    riskSensitivity: "balanced"
  };
}

function getTargetName(input: GenerationInput): string {
  return input.productMembership && !input.productMembership.startsWith("Khác")
    ? input.productMembership
    : "sản phẩm/membership cần xác nhận";
}

function getSuggestedCta(
  input: GenerationInput,
  data: BrandDataBundle,
  channel: JsonRecord
): string {
  if (input.cta.trim()) return input.cta.trim();

  const voice = asRecord(data.voiceRules.cta_library);
  const channelCtas = asArray<string>(channel.cta);
  if (channelCtas.length > 0) return channelCtas[0];

  if (input.outputType === "connected_point_pitch") {
    return asArray<string>(voice.connected_points)[0] ?? "Hẹn trao đổi mô hình hợp tác.";
  }

  if (input.outputType === "brand_alliance_invitation") {
    return asArray<string>(voice.brand_alliance)[0] ?? "Hẹn trao đổi partnership.";
  }

  if (input.outputType === "zalo_group_content") {
    return asArray<string>(voice.zalo_community)[0] ?? "Thả một câu để Bếp biết nhé.";
  }

  if (input.outputType === "sales_script") {
    return asArray<string>(voice.sales_leaders)[0] ?? "Gửi khách thông tin đã xác nhận.";
  }

  if (input.outputType === "membership_campaign_content") {
    return asArray<string>(voice.membership)[0] ?? "Xem quyền lợi member.";
  }

  return asArray<string>(voice.b2c)[0] ?? "Nhắn Bếp để được gợi ý.";
}

function getAudienceInsight(audience: JsonRecord, fallbackAudience: string): string {
  const name = asString(audience.name, fallbackAudience);
  const pain = asArray<string>(audience.pain_points)[0];
  const desire = asArray<string>(audience.desires)[0];
  const angle = asArray<string>(audience.message_angles)[0];
  return unique([name, pain, desire, angle]).join(" ");
}

function getMainMessage(
  data: BrandDataBundle,
  campaign: JsonRecord | null,
  membership: JsonRecord | null,
  product: JsonRecord | null
): string {
  const campaignMessage = asString(campaign?.main_message);
  if (campaignMessage) return campaignMessage;

  const membershipMessage = asString(membership?.main_message);
  if (membershipMessage) return membershipMessage;

  const productMessage = asArray<string>(product?.safe_messaging)[0];
  if (productMessage) return productMessage;

  return asString(asRecord(data.brandBrain.essence).short, "Ăn lành. Uống sạch. Sống yêu thương.");
}

function getTemplateName(input: GenerationInput): string {
  if (input.outputType === "zalo_group_content") return "zalo-post-template.md";
  if (input.outputType === "sales_script") return "sales-follow-up-template.md";
  if (input.outputType === "connected_point_pitch") return "point-opening-pitch-template.md";
  if (input.outputType === "brand_alliance_invitation") return "alliance-partner-invitation-template.md";
  return "design-brief-template.md";
}

function buildStrategicAngle(
  input: GenerationInput,
  data: BrandDataBundle,
  campaign: JsonRecord | null,
  membership: JsonRecord | null
): string[] {
  const target = getTargetName(input);
  const growthLoop = asArray<string>(asRecord(data.brandBrain).core_growth_loop).join(" -> ");
  const angles = [
    `Đặt ${target} trong hệ sinh thái BYT: sản phẩm F&B lành mạnh, membership, cộng đồng Zalo và mạng lưới B2B2C.`,
    "Không xử lý như brand đồ uống healthy generic; luôn giữ vai trò cộng đồng, chăm sóc chủ động và repeat purchase.",
    `Growth loop tham chiếu: ${growthLoop || "Product experience -> Membership -> Community -> Repeat purchase"}.`
  ];

  if (campaign) {
    angles.push(`Chiến dịch đang dùng: ${asString(campaign.name)} - ${asString(campaign.objective)}`);
  }

  if (membership) {
    angles.push("Membership là lớp đồng hành và duy trì thói quen, không phải liệu trình sức khỏe hay cam kết kết quả.");
  }

  if (input.outputType === "connected_point_pitch") {
    angles.push("Điểm bán kết nối là community touchpoint: khách biết BYT, quét QR, vào cộng đồng, trải nghiệm sản phẩm và mua/đăng ký khi phù hợp.");
  }

  if (input.outputType === "brand_alliance_invitation") {
    angles.push("Brand alliance phải cùng tệp và cùng giá trị trước khi cùng deal; không chỉ là trao đổi logo hoặc bán chéo.");
  }

  if (input.outputType === "sales_script") {
    angles.push("Sale BYT cần hỏi nhu cầu trước, tư vấn theo dữ liệu đã xác nhận và chuyển admin khi có câu hỏi nhạy cảm.");
  }

  return angles;
}

function buildHeadline(input: GenerationInput, mainMessage: string): string {
  const target = getTargetName(input);

  if (input.outputType === "connected_point_pitch") {
    return "Cùng BYT đưa lựa chọn ăn/uống lành đến gần khách địa phương";
  }

  if (input.outputType === "brand_alliance_invitation") {
    return "Cùng BYT tạo thêm giá trị chăm sóc chủ động cho cộng đồng chung";
  }

  if (input.outputType === "sales_script") {
    return `Script tư vấn ${target} theo cách nhẹ nhàng`;
  }

  if (input.outputType === "zalo_group_content") {
    return "Hôm nay mình bắt đầu bằng một lựa chọn lành hơn nhé?";
  }

  if (input.outputType === "brand_checker_report") {
    return "Báo cáo kiểm tra Brand Fit & Compliance";
  }

  if (input.campaign.toLowerCase().includes("ban mai")) {
    return "Bữa sáng lành hơn cho ngày bận rộn";
  }

  if (input.campaign.toLowerCase().includes("bình minh")) {
    return "Đón ngày mới bằng một thói quen vừa sức";
  }

  if (input.campaign.toLowerCase().includes("mặt trời")) {
    return "Một lựa chọn lành hơn cho căn bếp gia đình";
  }

  if (mainMessage.length > 0 && mainMessage.length <= 72) return mainMessage;
  return `Không cần hoàn hảo, bắt đầu bằng ${target}`;
}

function buildCopy(
  input: GenerationInput,
  data: BrandDataBundle,
  audience: JsonRecord,
  channel: JsonRecord,
  mainMessage: string,
  cta: string
): GeneratedOutput["copy"] {
  const target = getTargetName(input);
  const audienceName = asString(audience.name, input.audience);
  const goal = input.goal.trim() || "Tạo nội dung BYT đúng thương hiệu.";
  const offerLine = input.offer.trim()
    ? `Ưu đãi/chính sách nháp: ${input.offer.trim()} (cần founder xác nhận nếu có giá, quyền lợi, QR hoặc điều kiện áp dụng).`
    : "Ưu đãi/chính sách: chưa nhập, không tự thêm giá hoặc quyền lợi.";

  if (input.outputType === "zalo_group_content") {
    return {
      headline: buildHeadline(input, mainMessage),
      body: [
        "Cả nhà ơi, hôm nay Bếp gợi ý mình chọn một việc nhỏ để ngày bận vẫn lành hơn một chút.",
        `${target} có thể được giới thiệu như một lựa chọn ăn/uống sạch hơn, dễ bắt đầu hơn, không cần hoàn hảo.`,
        "Bạn đang muốn chăm bữa sáng, bữa xế hay thói quen uống sạch hôm nay?"
      ].join("\n\n"),
      supportingCopy: [
        "Câu hỏi tương tác: Hôm nay bạn muốn Bếp gợi ý món gì cho nhịp sinh hoạt của mình?",
        `CTA: ${cta}`,
        "Nếu khách hỏi bệnh nền, trẻ em, mẹ bầu, giảm cân hoặc thuốc đang dùng: chuyển sale/admin, không tư vấn trong nhóm."
      ]
    };
  }

  if (input.outputType === "sales_script") {
    return {
      headline: buildHeadline(input, mainMessage),
      body: [
        "Mở lời: Em/chị muốn Bếp gợi ý theo bữa sáng, bữa xế hay nhu cầu uống sạch trong ngày ạ?",
        `Lắng nghe: Với ${audienceName}, mình thường cần một lựa chọn gọn, dễ duy trì và không tạo thêm áp lực.`,
        `Gợi ý: ${target} có thể là một điểm bắt đầu nếu khẩu vị, thành phần và lịch dùng phù hợp với mình.`,
        offerLine,
        `Chốt nhẹ: ${cta}`,
        "Escalation: Nếu khách hỏi về bệnh lý, thuốc, trẻ em, mẹ bầu, giảm cân hoặc claim sức khỏe, ghi nhận câu hỏi và chuyển admin/chuyên môn."
      ].join("\n\n"),
      supportingCopy: [
        "Không nói: chữa bệnh, giảm cân nhanh, detox/thải độc, thay thế thuốc, cam kết hiệu quả.",
        "Không ép mua; hỏi nhu cầu trước khi tư vấn.",
        "Nếu thiếu giá/quyền lợi/chính sách, đánh dấu Cần founder xác nhận."
      ]
    };
  }

  if (input.outputType === "connected_point_pitch") {
    return {
      headline: buildHeadline(input, mainMessage),
      body: [
        "BYT không xem điểm kết nối chỉ là nơi đặt banner.",
        "Điểm kết nối là nơi khách địa phương có thể biết BYT, quét QR vào cộng đồng, tìm hiểu sản phẩm lành hơn và tham gia hoạt động chăm sóc chủ động khi phù hợp.",
        `Đề xuất thử nghiệm: dùng ${target} như điểm chạm đầu tiên, kèm QR/community CTA và script tư vấn ngắn cho nhân sự tại điểm.`,
        offerLine,
        `CTA cho chủ điểm: ${cta}`
      ].join("\n\n"),
      supportingCopy: [
        "Không hứa doanh thu/lợi nhuận.",
        "Cần xác nhận QR, banner, chính sách vận hành, trách nhiệm đổi trả và thông tin sản phẩm.",
        "Điểm phù hợp khi tệp khách quan tâm gia đình, văn phòng, wellness hoặc sản phẩm tiện lợi."
      ]
    };
  }

  if (input.outputType === "brand_alliance_invitation") {
    return {
      headline: buildHeadline(input, mainMessage),
      body: [
        "BYT tìm đối tác cùng tệp phụ nữ bận rộn, gia đình Việt hoặc cộng đồng wellness để cùng tạo giá trị thật.",
        "Hợp tác nên bắt đầu bằng một campaign nhỏ, rõ trách nhiệm, rõ sản phẩm/dịch vụ, rõ giá và rõ cách xử lý phản hồi khách hàng.",
        `Gợi ý nội dung: kết nối ${target} với một deal/campaign đồng giá trị, không claim thay đối tác và không dùng logo khi chưa được phép.`,
        `CTA: ${cta}`
      ].join("\n\n"),
      supportingCopy: [
        "Cần xác nhận điều kiện deal, logo đối tác, pricing, quyền sử dụng hình ảnh và phạm vi truyền thông.",
        "Không hứa kết quả kinh doanh.",
        "Không để đối tác dùng BYT như bảo chứng y tế hoặc bảo chứng chất lượng chưa kiểm định."
      ]
    };
  }

  if (input.outputType === "brand_checker_report") {
    return {
      headline: buildHeadline(input, mainMessage),
      body: [
        `Nội dung cần kiểm: ${goal}`,
        `Kênh/format: ${input.channel} / ${input.format}`,
        `Sản phẩm hoặc membership: ${target}`,
        "Báo cáo bên dưới kiểm tra brand fit, business model fit, product/membership accuracy và compliance risk theo Brand Brain BYT."
      ].join("\n\n"),
      supportingCopy: [
        "Kết quả không thay thế phê duyệt founder cho giá, chính sách, logo, QR hoặc tài sản thương hiệu.",
        "Nếu có health/wellness claim nhạy cảm, cần human approval trước khi xuất bản."
      ]
    };
  }

  return {
    headline: buildHeadline(input, mainMessage),
    body: [
      `${goal}`,
      `${target} nên được đặt trong tinh thần BYT: ăn lành, uống sạch, sống yêu thương; gần gũi với ${audienceName}.`,
      mainMessage,
      offerLine,
      `CTA: ${cta}`
    ].join("\n\n"),
    supportingCopy: [
      `Tone: ${input.tone || asString(channel.tone, "ấm, rõ, không ép mua")}.`,
      "Giữ thông điệp là lựa chọn lành hơn và dễ duy trì hơn, không phải cam kết sức khỏe.",
      "Kết nối sang membership, Zalo community hoặc repeat purchase nếu phù hợp."
    ]
  };
}

function getLayoutStructure(input: GenerationInput): string[] {
  if (input.format === "Facebook story") {
    return [
      "Top: headline ngắn, tối đa 1-2 dòng.",
      "Middle: ảnh/khoảnh khắc sản phẩm hoặc cộng đồng, chừa safe area cho story.",
      "Bottom: CTA một hành động, không nhồi nhiều thông tin."
    ];
  }

  if (input.format === "TikTok/Reel cover") {
    return [
      "Cover: một hook ngắn trong vùng giữa màn hình.",
      "Visual: cảnh thật hoặc sản phẩm rõ, tránh stock-photo generic.",
      "CTA: chỉ dùng nếu còn đủ khoảng thở; ưu tiên dễ đọc trên mobile."
    ];
  }

  if (input.format.includes("POSM") || input.format.includes("QR") || input.channel === "POSM") {
    return [
      "Top: headline rất ngắn, dễ đọc từ xa.",
      "Middle: QR hoặc thông tin điểm chạm, QR cần founder/admin xác nhận.",
      "Bottom: CTA và guardrail ngắn; không dùng claim y tế hoặc giá chưa chốt."
    ];
  }

  if (input.outputType === "connected_point_pitch" || input.format.includes("Connected point")) {
    return [
      "Top: giá trị cho chủ điểm và khách địa phương.",
      "Middle: mô hình điểm chạm cộng đồng, QR, sản phẩm, membership.",
      "Bottom: bước tiếp theo để hẹn trao đổi và xác nhận chính sách."
    ];
  }

  if (input.outputType === "brand_alliance_invitation" || input.format.includes("alliance")) {
    return [
      "Top: giá trị hợp tác chung, không dùng logo lockup nếu chưa có quyền.",
      "Middle: tệp khách chung, campaign thử nghiệm, deal clarity.",
      "Bottom: CTA hẹn trao đổi và checklist cần xác nhận."
    ];
  }

  return [
    "Top: headline ngắn, đọc rõ trên mobile.",
    "Middle: sản phẩm/khoảnh khắc đời sống hoặc community cue.",
    "Bottom: CTA chính và ghi chú founder confirmation nếu có giá/quyền lợi/QR."
  ];
}

function buildDesignBrief(
  input: GenerationInput,
  data: BrandDataBundle,
  audience: JsonRecord,
  campaign: JsonRecord | null,
  membership: JsonRecord | null,
  product: JsonRecord | null,
  mainMessage: string
): GeneratedOutput["designBrief"] {
  const target = getTargetName(input);
  const campaignAngle = asString(campaign?.objective) || `Dùng ${target} để giúp khách bắt đầu thói quen lành hơn và đi vào cộng đồng BYT.`;
  const audienceInsight = getAudienceInsight(audience, input.audience);
  const productSafeMessage = asArray<string>(product?.safe_messaging)[0];
  const membershipMessage = asString(membership?.main_message);

  return {
    campaignAngle,
    audienceInsight,
    mainMessage: productSafeMessage || membershipMessage || mainMessage,
    visualConcept:
      "Cảm giác bếp Việt hiện đại, sạch, thật và gần; ưu tiên khoảnh khắc sản phẩm/khách hàng trong đời sống hơn là hình ảnh y tế, diet cực đoan hoặc luxury giả.",
    layoutStructure: getLayoutStructure(input),
    colorDirection:
      "Hướng màu sạch, ấm, tự nhiên, có tương phản đủ đọc trên mobile. Không dùng HEX chính thức vì màu thương hiệu chưa xác nhận. Cần founder xác nhận.",
    typographyDirection:
      "Sans-serif rõ ràng, dễ đọc, không dùng chữ quá mảnh hoặc quá trang trí. Font chính thức cần founder xác nhận.",
    imageDirection:
      "Ảnh sản phẩm thật, ánh sáng tự nhiên, bối cảnh bếp/văn phòng/gia đình/điểm bán phù hợp. Không tự tạo packaging hoặc logo nếu chưa duyệt.",
    iconIllustrationDirection:
      "Icon tối giản cho thói quen, community, membership, QR hoặc checklist. Không dùng biểu tượng bệnh viện, thuốc, bác sĩ hoặc body transformation."
  };
}

function matchTerms(source: string, terms: string[]): string[] {
  const normalizedSource = normalizeText(source);
  return unique(
    terms.filter((term) => {
      const normalizedTerm = normalizeText(term.replace(/[.。]+$/g, ""));
      return normalizedTerm.length > 2 && normalizedSource.includes(normalizedTerm);
    })
  );
}

function offerLooksLikePricing(offer: string): boolean {
  return /(\d+\s*(k|đ|vnd|vnđ)|%|miễn phí|free)/i.test(offer);
}

function buildFounderConfirmations(
  input: GenerationInput,
  membership: JsonRecord | null,
  product: JsonRecord | null,
  campaign: JsonRecord | null
): string[] {
  const confirmations = [
    "Logo chính thức, cách đặt logo và lockup slogan.",
    "Màu thương hiệu/HEX chính thức.",
    "Font thương hiệu chính thức.",
    "Ảnh sản phẩm, bao bì và tình trạng asset được phép dùng."
  ];

  if (membership) {
    confirmations.push("Giá, thời hạn, quyền lợi và member price của membership.");
  }

  if (product && asBoolean(product.founder_confirmation_needed)) {
    confirmations.push("Tên, công thức, thành phần, hạn dùng, bảo quản và claim được phép của sản phẩm.");
  }

  if (campaign && asBoolean(campaign.founder_confirmation_needed)) {
    confirmations.push("Phạm vi campaign, offer, CTA, lịch triển khai và nội dung đã duyệt.");
  }

  if (input.offer.trim()) {
    confirmations.push("Điều kiện áp dụng offer, giá, thời hạn và trách nhiệm xử lý đơn/đổi trả.");
  }

  if (input.channel === "POSM" || input.channel === "Connected point" || input.format.includes("QR")) {
    confirmations.push("QR/link, banner/POSM, vị trí đặt tại điểm và quyền dùng thương hiệu BYT.");
  }

  if (input.channel === "Alliance partner" || input.outputType === "brand_alliance_invitation") {
    confirmations.push("Logo đối tác, deal terms, nguồn sản phẩm/dịch vụ, pricing, trách nhiệm khiếu nại và phạm vi co-branding.");
  }

  if (normalizeText(input.productMembership).includes("mat troi") || input.audience === "parents_families") {
    confirmations.push("Quy định nội dung cho trẻ em/gia đình, thành phần phù hợp và phê duyệt chuyên môn nếu có.");
  }

  if (input.outputType === "sales_script") {
    confirmations.push("Chính sách sale/CTV/leader/affiliate, hoa hồng và quyền dùng script.");
  }

  return unique(confirmations);
}

function buildComplianceCheck(
  input: GenerationInput,
  data: BrandDataBundle,
  membership: JsonRecord | null,
  product: JsonRecord | null,
  channel: JsonRecord,
  founderConfirmationNeeded: string[]
): ComplianceCheck {
  const sourceText = [
    input.goal,
    input.productMembership,
    input.campaign,
    input.channel,
    input.format,
    input.offer,
    input.cta,
    input.tone,
    input.notes
  ].join(" ");

  const forbiddenHealth = asArray<string>(data.complianceRules.forbidden_health_claims);
  const forbiddenVoice = asArray<string>(data.voiceRules.forbidden_phrases);
  const explicitHighRiskTerms = [
    "thay thế thuốc",
    "không cần dùng thuốc",
    "điều trị",
    "chữa",
    "khỏi bệnh",
    "cam kết giảm",
    "giảm cân nhanh",
    "giảm mỡ bụng",
    "đốt mỡ",
    "detox cơ thể",
    "thải độc",
    "thu nhập chắc chắn",
    "thu nhập ổn định",
    "doanh thu chắc chắn",
    "có lời ngay",
    "làm giàu"
  ];
  const sensitiveTopics = asArray<string>(data.complianceRules.sensitive_topics_requiring_human_approval);
  const visualAvoid = asArray<string>(data.complianceRules.visual_avoid);

  const highMatches = matchTerms(sourceText, [
    ...forbiddenHealth,
    ...forbiddenVoice,
    ...explicitHighRiskTerms
  ]);
  const sensitiveMatches = matchTerms(sourceText, sensitiveTopics);
  const visualMatches = matchTerms(sourceText, visualAvoid);

  const mediumReasons: string[] = [];

  if (sensitiveMatches.length > 0 && highMatches.length === 0) {
    mediumReasons.push(`Có chủ đề nhạy cảm cần duyệt: ${sensitiveMatches.join(", ")}.`);
  }

  if (asString(product?.public_name_risk)) {
    mediumReasons.push(asString(product?.public_name_risk));
  }

  if (membership && offerLooksLikePricing(input.offer)) {
    mediumReasons.push("Có giá/offer liên quan membership, cần founder xác nhận trước khi công bố.");
  }

  if (asBoolean(channel.founder_confirmation_needed)) {
    mediumReasons.push("Kênh/tài liệu này có QR/POSM/chính sách hoặc asset cần founder xác nhận.");
  }

  if (input.outputType === "connected_point_pitch") {
    mediumReasons.push("Connected point cần chính sách điểm, QR, POSM và trách nhiệm vận hành được duyệt.");
  }

  if (input.outputType === "brand_alliance_invitation") {
    mediumReasons.push("Brand alliance cần deal terms, quyền dùng logo và trách nhiệm đối tác rõ ràng.");
  }

  if (
    input.riskSensitivity === "conservative" &&
    founderConfirmationNeeded.length > 0 &&
    highMatches.length === 0
  ) {
    mediumReasons.push("Risk sensitivity đang để conservative nên các thông tin chưa xác nhận phải được duyệt trước.");
  }

  if (visualMatches.length > 0) {
    mediumReasons.push(`Visual có tín hiệu lệch brand: ${visualMatches.join(", ")}.`);
  }

  let riskLevel: ComplianceRisk = "Low";
  if (highMatches.length > 0) {
    riskLevel = "High";
  } else if (mediumReasons.length > 0) {
    riskLevel = "Medium";
  }

  const detectedRisks = unique([
    ...highMatches.map((match) => `Rủi ro cao: ${match}`),
    ...mediumReasons
  ]);

  const saferRewrite =
    riskLevel === "Low"
      ? "Có thể giữ wording theo hướng: hỗ trợ lối sống lành mạnh, dễ bắt đầu thói quen tốt, đồng hành chăm sóc chủ động."
      : "Rewrite an toàn: BYT đồng hành giúp khách dễ bắt đầu lựa chọn ăn/uống lành hơn, kiểm tra thành phần theo nhu cầu cá nhân và không cam kết điều trị, giảm cân, detox/thải độc, miễn dịch hoặc thu nhập.";

  const recommendation =
    riskLevel === "High" ? "Reject" : riskLevel === "Medium" ? "Revise" : "Approved";

  return {
    riskLevel,
    detectedRisks: detectedRisks.length > 0 ? detectedRisks : ["Không phát hiện claim y tế/thu nhập rủi ro trong input."],
    saferRewrite,
    humanApprovalRequired: riskLevel !== "Low",
    recommendation,
    checklist: [
      "Không có claim chữa bệnh/điều trị/thay thế thuốc.",
      "Không cam kết giảm cân, detox/thải độc hoặc hiệu quả sức khỏe.",
      "Không hứa thu nhập, doanh thu, lợi nhuận cho CTV/Sale/Leader/điểm bán.",
      "Không dùng giá, quyền lợi, logo, QR, font, màu hoặc ảnh sản phẩm như đã chốt nếu chưa xác nhận.",
      "Copy đủ ngắn cho mobile và CTA chỉ có một hành động chính."
    ]
  };
}

function scoreOutput(
  input: GenerationInput,
  membership: JsonRecord | null,
  product: JsonRecord | null,
  compliance: ComplianceCheck
): BrandCheckerScores {
  const source = normalizeText([input.goal, input.notes, input.tone].join(" "));
  const hasGenericRetailSignal = source.includes("chi ban le") || source.includes("ban san pham le");
  const hasAggressiveTone =
    source.includes("chot ngay") || source.includes("khong mua la thiet") || source.includes("mua ngay keo het");
  const hasMobileTextRisk =
    input.notes.length > 320 &&
    (input.channel === "Zalo group" || input.channel === "TikTok/Reels" || input.channel === "POSM");
  const hasCta = input.cta.trim().length > 0;
  const isCommunity =
    input.channel === "Zalo group" ||
    input.outputType === "zalo_group_content" ||
    input.outputType === "membership_campaign_content";
  const isEcosystem =
    isCommunity ||
    input.outputType === "connected_point_pitch" ||
    input.outputType === "brand_alliance_invitation" ||
    input.outputType === "sales_script";
  const riskPenalty = compliance.riskLevel === "High" ? 3 : compliance.riskLevel === "Medium" ? 1 : 0;
  const offerHasPrice = offerLooksLikePricing(input.offer);

  let brandFit = 9 - riskPenalty - (hasGenericRetailSignal ? 2 : 0);
  let visualFit = 8 - riskPenalty - (hasMobileTextRisk ? 2 : 0);
  let voiceFit = 9 - riskPenalty - (hasAggressiveTone ? 3 : 0);
  let businessModelFit = (isEcosystem ? 9 : 8) - (hasGenericRetailSignal ? 2 : 0);
  let productAccuracy = product ? (asBoolean(product.founder_confirmation_needed) ? 7 : 8) : 7;
  let membershipAccuracy = membership ? (offerHasPrice ? 6 : 7) : 8;
  let communityFit = isCommunity ? 9 : isEcosystem ? 8 : 7;
  let conversionClarity = hasCta ? 9 : 6;
  let channelFit = 8 - (hasMobileTextRisk ? 2 : 0);

  if (compliance.riskLevel === "High") {
    voiceFit = Math.min(voiceFit, 5);
    productAccuracy = Math.min(productAccuracy, 5);
    membershipAccuracy = Math.min(membershipAccuracy, 6);
    conversionClarity = Math.min(conversionClarity, 6);
  }

  return {
    brandFit: clampScore(brandFit),
    visualFit: clampScore(visualFit),
    voiceFit: clampScore(voiceFit),
    businessModelFit: clampScore(businessModelFit),
    productAccuracy: clampScore(productAccuracy),
    membershipAccuracy: clampScore(membershipAccuracy),
    communityFit: clampScore(communityFit),
    conversionClarity: clampScore(conversionClarity),
    channelFit: clampScore(channelFit),
    complianceRisk: compliance.riskLevel
  };
}

function formatScores(scores: BrandCheckerScores): string {
  return [
    "| Dimension | Score/Risk | Note |",
    "| --- | --- | --- |",
    `| Brand fit | ${scores.brandFit}/10 | Đúng tinh thần BYT và không generic healthy drink brand. |`,
    `| Visual fit | ${scores.visualFit}/10 | Dễ đọc, tránh medical/extreme fitness/fake luxury/neon. |`,
    `| Voice fit | ${scores.voiceFit}/10 | Ấm, thực tế, không phán xét, không ép mua. |`,
    `| Business model fit | ${scores.businessModelFit}/10 | Gắn product, membership, community và B2B2C khi phù hợp. |`,
    `| Product accuracy | ${scores.productAccuracy}/10 | Không bịa công dụng/thành phần/giá/chứng nhận. |`,
    `| Membership accuracy | ${scores.membershipAccuracy}/10 | Đúng tên thẻ; giá/quyền lợi cần xác nhận nếu dùng. |`,
    `| Community fit | ${scores.communityFit}/10 | Có hướng nuôi cộng đồng/repeat purchase, không spam. |`,
    `| Conversion clarity | ${scores.conversionClarity}/10 | CTA rõ, không gây áp lực. |`,
    `| Channel fit | ${scores.channelFit}/10 | Phù hợp vai trò kênh và format. |`,
    `| Compliance risk | ${scores.complianceRisk} | Mức rủi ro sau checklist. |`
  ].join("\n");
}

function toMarkdown(input: GenerationInput, output: Omit<GeneratedOutput, "markdown">): string {
  return [
    "# BYT Brand Brain Output",
    "",
    `- Loại output: ${outputTypeLabels[input.outputType]}`,
    `- Goal: ${input.goal || "Chưa nhập"}`,
    `- Audience: ${input.audience}`,
    `- Product/membership: ${input.productMembership}`,
    `- Campaign: ${input.campaign}`,
    `- Channel/format: ${input.channel} / ${input.format}`,
    `- Risk sensitivity: ${input.riskSensitivity}`,
    "",
    "## Strategic Angle",
    ...output.strategicAngle.map((item) => `- ${item}`),
    "",
    "## Copy",
    `### Headline`,
    output.copy.headline,
    "",
    "### Body",
    output.copy.body,
    "",
    "### Supporting Copy",
    ...output.copy.supportingCopy.map((item) => `- ${item}`),
    "",
    "## Design Brief",
    `- Campaign angle: ${output.designBrief.campaignAngle}`,
    `- Audience insight: ${output.designBrief.audienceInsight}`,
    `- Main message: ${output.designBrief.mainMessage}`,
    `- Visual concept: ${output.designBrief.visualConcept}`,
    "- Layout structure:",
    ...output.designBrief.layoutStructure.map((item) => `  - ${item}`),
    `- Color direction: ${output.designBrief.colorDirection}`,
    `- Typography direction: ${output.designBrief.typographyDirection}`,
    `- Image direction: ${output.designBrief.imageDirection}`,
    `- Icon/illustration direction: ${output.designBrief.iconIllustrationDirection}`,
    "",
    "## Sales / Community CTA",
    output.salesCommunityCta,
    "",
    "## Compliance Check",
    `- Risk level: ${output.complianceCheck.riskLevel}`,
    `- Recommendation: ${output.complianceCheck.recommendation}`,
    `- Human approval required: ${output.complianceCheck.humanApprovalRequired ? "Có" : "Không"}`,
    "- Detected risks:",
    ...output.complianceCheck.detectedRisks.map((item) => `  - ${item}`),
    `- Safer rewrite: ${output.complianceCheck.saferRewrite}`,
    "- Checklist:",
    ...output.complianceCheck.checklist.map((item) => `  - ${item}`),
    "",
    "## Brand Checker Score",
    formatScores(output.brandCheckerScore),
    "",
    "## Cần Founder Xác Nhận",
    ...output.founderConfirmationNeeded.map((item) => `- ${item}`),
    "",
    "## Source Files Used",
    ...output.sourceFilesUsed.map((file) => `- ${file}`)
  ].join("\n");
}

export function generateBrandOutput(input: GenerationInput, data: BrandDataBundle): GeneratedOutput {
  const membership = findMembership(data, input.productMembership);
  const product = findProduct(data, input.productMembership);
  const campaign = findCampaign(data, input.campaign);
  const audience = findAudience(data, input.audience);
  const channel = findChannel(data, input.channel);
  const mainMessage = getMainMessage(data, campaign, membership, product);
  const cta = getSuggestedCta(input, data, channel);
  const founderConfirmationNeeded = buildFounderConfirmations(input, membership, product, campaign);
  const complianceCheck = buildComplianceCheck(
    input,
    data,
    membership,
    product,
    channel,
    founderConfirmationNeeded
  );
  const brandCheckerScore = scoreOutput(input, membership, product, complianceCheck);
  const copy = buildCopy(input, data, audience, channel, mainMessage, cta);
  const designBrief = buildDesignBrief(input, data, audience, campaign, membership, product, mainMessage);
  const strategicAngle = buildStrategicAngle(input, data, campaign, membership);
  const templateName = getTemplateName(input);

  const outputWithoutMarkdown = {
    strategicAngle,
    copy,
    designBrief,
    salesCommunityCta: cta,
    complianceCheck,
    brandCheckerScore,
    founderConfirmationNeeded,
    sourceFilesUsed: unique([...sourceFilesUsed, `templates/${templateName}`])
  };

  return {
    ...outputWithoutMarkdown,
    markdown: toMarkdown(input, outputWithoutMarkdown)
  };
}

export function riskBadgeClasses(risk: ComplianceRisk): string {
  if (risk === "High") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "Medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function riskSensitivityLabel(value: RiskSensitivity): string {
  if (value === "conservative") return "Conservative";
  if (value === "sales-oriented") return "Sales-oriented";
  return "Balanced";
}
