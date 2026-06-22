"""Generate BYT group sales content drafts from local brand sources.

The script is deterministic and does not call an AI API. It creates safe draft
posts for group channels, then marks live business fields that still need
admin/founder confirmation before publishing.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "outputs" / "group-content-pack.sample.md"

LANE_ORDER = [
    "healthy_living",
    "product_deal",
    "mua_gom",
    "membership",
    "ctv_affiliate",
    "connected_point",
]

EXTRA_BLOCKED_TERMS = [
    "detox",
    "thải độc",
    "thanh lọc",
    "giảm cân",
    "giảm mỡ",
    "đốt mỡ",
    "tiểu đường",
    "mỡ máu",
    "gan",
    "thận",
    "miễn dịch",
    "đề kháng",
    "điều trị",
    "chữa",
    "trị ",
    "cam kết",
]


@dataclass(frozen=True)
class Product:
    name: str
    category: str
    description: str
    audience: str
    pricing: dict[str, Any]
    source_row_number: int

    @property
    def retail_price_label(self) -> str:
        return format_price(self.pricing.get("retail"))


def load_json(relative_path: str) -> Any:
    path = ROOT / relative_path
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        raise SystemExit(f"Missing required file: {path}") from None
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc


def latest_product_catalog_path() -> str:
    source_index = load_json("brand-data/sources/source-index.json")
    quick_paths = source_index.get("quick_paths", {})
    path = quick_paths.get("normalized_product_catalog")
    if not path:
        raise SystemExit("source-index.json does not define quick_paths.normalized_product_catalog")
    return path


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def format_price(value: Any) -> str:
    raw = normalize_text(value)
    if not raw or raw in {"-", "nan", "None"}:
        return "Cần xác nhận"
    cleaned = re.sub(r"[^\d.]", "", raw)
    if not cleaned:
        return "Cần xác nhận"
    try:
        number = int(round(float(cleaned)))
    except ValueError:
        return "Cần xác nhận"
    if number <= 0:
        return "Cần xác nhận"
    return f"{number:,}đ".replace(",", ".")


def build_blocked_terms() -> list[str]:
    compliance = load_json("brand-data/compliance-rules.json")
    voice = load_json("brand-data/voice-rules.json")
    terms = []
    terms.extend(compliance.get("forbidden_health_claims", []))
    terms.extend(voice.get("forbidden_phrases", []))
    terms.extend(EXTRA_BLOCKED_TERMS)
    return sorted({term.lower().strip() for term in terms if term})


def has_blocked_term(text: str, blocked_terms: list[str]) -> bool:
    lower = text.lower()
    return any(term in lower for term in blocked_terms)


def load_products(product_catalog_path: str, blocked_terms: list[str]) -> tuple[list[Product], int]:
    catalog = load_json(product_catalog_path)
    raw_products = catalog.get("products", [])
    safe_products: list[Product] = []

    for index, item in enumerate(raw_products, start=1):
        product = Product(
            name=normalize_text(item.get("name")),
            category=normalize_text(item.get("category")),
            description=normalize_text(item.get("description")),
            audience=normalize_text(item.get("audience")),
            pricing=item.get("pricing") or {},
            source_row_number=index,
        )
        public_text = " ".join([product.name, product.category, product.description, product.audience])
        if not product.name or has_blocked_term(public_text, blocked_terms):
            continue
        safe_products.append(product)

    return prioritize_products(safe_products), len(raw_products)


def prioritize_products(products: list[Product]) -> list[Product]:
    priority = [
        "Sữa hạt daily 250 ml",
        "Sữa hạt daily 330 ml",
        "Sữa hạt daily 1000 ml",
        "Sữa hạt cao cấp",
        "Hạt lành mỗi ngày",
        "Smoothie hoa quả",
        "Salad",
        "Hoa quả",
        "Trà thảo mộc",
        "Hũ mạch yêu thương",
    ]

    def score(product: Product) -> tuple[int, int]:
        category = product.category.lower()
        for idx, label in enumerate(priority):
            if label.lower() in category:
                return (idx, product.source_row_number)
        return (len(priority), product.source_row_number)

    return sorted(products, key=score)


def suggested_use_case(product: Product) -> str:
    text = f"{product.name} {product.category}".lower()
    if "sữa hạt" in text:
        return "bữa sáng hoặc bữa xế"
    if "smoothie" in text:
        return "bữa xế hoặc lúc cần một món uống gọn hơn"
    if "hạt" in text:
        return "món mang theo trong ngày"
    if "salad" in text:
        return "bữa trưa hoặc bữa nhẹ đã chuẩn bị sẵn"
    if "hoa quả" in text:
        return "bữa xế cho nhóm hoặc gia đình"
    if "trà" in text:
        return "một nhịp uống chậm trong ngày"
    return "ngày bận cần lựa chọn gọn hơn"


def build_blueprints() -> list[dict[str, str]]:
    return [
        {
            "lane": "healthy_living",
            "time": "07:30",
            "pillar": "Thói quen nhỏ",
            "goal": "Kéo tương tác buổi sáng",
            "caption": (
                "Sáng nay mình không cần bắt đầu thật hoàn hảo.\n\n"
                "Chỉ cần chọn một điều nhỏ dễ làm hơn: chuẩn bị bữa sáng gọn hơn, uống đủ hơn một chút, "
                "hoặc để sẵn một món lành hơn cho lúc bận. BYT gợi ý bắt đầu từ thứ hợp lịch sinh hoạt, "
                "hợp vị và mình thấy dễ duy trì.\n\n"
                "Bếp sẽ dựa trên menu hiện có để gợi ý nhẹ nhàng và đúng nhu cầu hơn."
            ),
            "question": "Sáng nay bạn cần bữa sáng nhanh hay bữa xế dễ mang theo?",
            "cta": "Nhắn Bếp để nhận gợi ý hôm nay.",
            "pinned_comment": "Bếp sẽ gợi ý theo menu thực tế và nhắc kiểm tra thành phần nếu bạn có nhu cầu ăn uống đặc biệt.",
            "image_brief": "Headline: Bữa sáng dễ bắt đầu. Visual: bàn ăn sáng gọn, sáng tự nhiên, ít chữ.",
            "confirmation": "Menu hôm nay; sản phẩm còn hàng nếu admin gợi ý sản phẩm cụ thể.",
        },
        {
            "lane": "product_deal",
            "time": "09:00",
            "pillar": "Hôm nay Bếp có gì",
            "goal": "Kéo inbox xem menu/đặt hàng",
            "caption": (
                "Hôm nay Bếp có {product} cho ai cần một lựa chọn gọn hơn trong {use_case}.\n\n"
                "Bếp sẽ xác nhận menu, giá và khung giao trước khi chốt để mọi người chọn đúng nhu cầu. "
                "Nếu bạn chưa chắc hợp vị nào, cứ nhắn Bếp hỏi trước, không cần vội mua.\n\n"
                "Ai cần menu, Bếp gửi riêng danh sách món đang có để chọn cho dễ."
            ),
            "question": "Bạn muốn Bếp gửi menu theo bữa sáng, bữa xế hay cả tuần?",
            "cta": "Nhắn Bếp để nhận menu hôm nay.",
            "pinned_comment": "Giá, tồn kho và giờ giao cần admin xác nhận theo ngày đăng.",
            "image_brief": "Headline: Hôm nay Bếp có gì? Visual: ảnh sản phẩm thật, nền sạch, CTA nhỏ.",
            "confirmation": "Giá, ưu đãi, tồn kho, giờ chốt, khu vực giao, ảnh sản phẩm.",
        },
        {
            "lane": "mua_gom",
            "time": "11:00",
            "pillar": "Mua gom giá tốt",
            "goal": "Gom nhu cầu theo khu vực",
            "caption": (
                "Bếp mở kèo gom cho {product} nếu nhóm mình đủ người cùng đặt.\n\n"
                "Gom đơn giúp Bếp chuẩn bị gọn hơn và mọi người dễ nhận cùng khung giờ. "
                "Mức giá/ưu đãi sẽ được admin xác nhận theo bảng mới nhất trước khi chốt, nên ai quan tâm cứ để lại khu trước.\n\n"
                "Ai quan tâm có thể nhắn khu/tòa để admin xếp danh sách."
            ),
            "question": "Nhóm mình muốn gom theo tòa, văn phòng hay khu dân cư?",
            "cta": "Nhắn khu/tòa để admin xếp đơn.",
            "pinned_comment": "Chỉ chốt khi đủ điều kiện gom và admin đã xác nhận giá, điểm giao, giờ giao.",
            "image_brief": "Headline: Gom đơn cùng khu. Visual: nhiều phần sản phẩm xếp gọn, icon địa điểm.",
            "confirmation": "Mức giá gom, số lượng mục tiêu, giờ chốt, điểm giao, tồn kho.",
        },
        {
            "lane": "membership",
            "time": "13:30",
            "pillar": "Duy trì thói quen",
            "goal": "Upsell membership mềm",
            "caption": (
                "Có nhiều người không thiếu quyết tâm, chỉ thiếu một cách duy trì nhẹ nhàng hơn.\n\n"
                "Membership BYT phù hợp với những ai hay mua lẻ rồi quên đặt, muốn có menu/gợi ý đều hơn và một cộng đồng nhắc nhau bằng thói quen nhỏ. "
                "Bếp sẽ gửi quyền lợi đã công bố để bạn tự xem có hợp nhu cầu không.\n\n"
                "Ai muốn xem thông tin, Bếp gửi riêng quyền lợi đã công bố."
            ),
            "question": "Bạn thường quên đặt bữa sáng, bữa xế hay đồ uống trong tuần?",
            "cta": "Nhắn Bếp để nhận quyền lợi đã công bố.",
            "pinned_comment": "Không tự công bố giá/quyền lợi nếu chưa đối chiếu bảng membership mới nhất.",
            "image_brief": "Headline: Duy trì dễ hơn. Visual: lịch tuần, món ăn/uống, cảm giác cộng đồng.",
            "confirmation": "Hạng thẻ, giá, quyền lợi, quà tặng, điều kiện áp dụng.",
        },
        {
            "lane": "ctv_affiliate",
            "time": "15:30",
            "pillar": "Đào tạo CTV",
            "goal": "Giúp CTV đăng bài đúng chuẩn",
            "caption": (
                "Bài bán hàng tốt của BYT nên bắt đầu bằng một câu hỏi, không phải bằng lời thúc mua.\n\n"
                "CTV có thể nhắn: \"Chị muốn dùng cho bữa sáng, bữa xế hay chuẩn bị sẵn cho cả nhà ạ? "
                "Em hỏi trước để gợi ý đúng nhu cầu hơn.\" Sau đó mới gửi menu/giá đã được duyệt.\n\n"
                "Lưu lại script này và gửi leader duyệt nếu bài có giá, chính sách hoặc thông tin nhạy cảm."
            ),
            "question": "Tình huống nào CTV hay bí lời nhất khi khách hỏi?",
            "cta": "Lưu script này trước khi tư vấn.",
            "pinned_comment": "Không hứa thu nhập, không claim sức khỏe, không tự tạo giá/chính sách.",
            "image_brief": "Headline: Hỏi trước, gợi ý sau. Visual: màn hình chat thân thiện, checklist 3 dòng.",
            "confirmation": "Deal được duyệt, chính sách CTV/hoa hồng, tài liệu training mới nhất.",
        },
        {
            "lane": "connected_point",
            "time": "17:00",
            "pillar": "Điểm bán kết nối",
            "goal": "Tìm chủ điểm/đối tác phù hợp",
            "caption": (
                "Nếu cửa hàng/spa/phòng tập của bạn có tệp khách quan tâm lối sống lành hơn, BYT có thể cùng trao đổi một mô hình hợp tác vừa sức.\n\n"
                "Mục tiêu không phải đặt thêm áp lực bán hàng, mà là có thêm lựa chọn ăn/uống tử tế hơn cho khách tại điểm chạm địa phương. "
                "Hai bên sẽ cùng xem tệp khách, cách trưng bày, QR cộng đồng và điều kiện vận hành trước khi thử.\n\n"
                "Gửi thông tin điểm nếu bạn muốn BYT xem xét mô hình phù hợp."
            ),
            "question": "Điểm của bạn đang phục vụ tệp khách nào nhiều nhất?",
            "cta": "Gửi thông tin điểm để BYT xem xét mô hình phù hợp.",
            "pinned_comment": "Không hứa doanh thu/lợi nhuận; mọi chính sách hợp tác cần founder/admin xác nhận.",
            "image_brief": "Headline: Thêm lựa chọn lành hơn. Visual: quầy nhỏ, QR placeholder, sản phẩm thật.",
            "confirmation": "Mô hình hợp tác, chính sách điểm bán, QR, logo/asset đối tác.",
        },
        {
            "lane": "healthy_living",
            "time": "19:30",
            "pillar": "Poll tương tác",
            "goal": "Kéo comment để hiểu nhu cầu",
            "caption": (
                "Tối nay Bếp xin phép hỏi nhanh để chuẩn bị menu ngày mai sát nhu cầu hơn.\n\n"
                "Nếu phải chọn một món dễ duy trì trong tuần, bạn sẽ chọn gì: sữa hạt, smoothie, hạt lành, salad hay hoa quả gọt sẵn? "
                "Bếp sẽ dựa vào bình chọn để gợi ý menu ngày mai, nhưng vẫn để mọi người chọn theo khẩu vị và nhu cầu riêng.\n\n"
                "Bạn có thể thả tên món mình muốn thấy để Bếp ưu tiên khi chuẩn bị menu ngày mai."
            ),
            "question": "Bạn muốn menu ngày mai có món nào nhất?",
            "cta": "Thả tên món bạn muốn thấy trong menu ngày mai.",
            "pinned_comment": "Bếp tổng hợp nhu cầu để chuẩn bị menu; giá và tồn kho sẽ được xác nhận sau.",
            "image_brief": "Headline: Vote menu ngày mai. Visual: 4 lựa chọn món, ô vote rõ trên mobile.",
            "confirmation": "Menu ngày mai, tồn kho, ảnh món, giá nếu đăng kèm.",
        },
    ]


def render_post(index: int, blueprint: dict[str, str], product: Product, product_catalog_path: str) -> str:
    product_reference = "Không dùng sản phẩm cụ thể"
    source_used = "brand-brain/13-group-sales-content-brain.md; brand-data/compliance-rules.json"
    caption = blueprint["caption"]

    if "{product}" in caption:
        product_reference = f"{product.name} ({product.category}; giá nguồn: {product.retail_price_label})"
        source_used = f"brand-data/sources/source-index.json; {product_catalog_path}"
        caption = caption.format(product=product.name, use_case=suggested_use_case(product))

    return f"""### Post {index}: {blueprint['pillar']}

- Group type: `{blueprint['lane']}`
- Mục tiêu: {blueprint['goal']}
- Khung giờ gợi ý: {blueprint['time']}
- Sản phẩm tham chiếu: {product_reference}
- Nguồn dữ liệu: {source_used}

#### Caption

{caption}

#### Interaction Question

{blueprint['question']}

#### CTA

{blueprint['cta']}

#### Image Brief

{blueprint['image_brief']}

#### Compliance Notes

- Không dùng claim y tế, giảm cân, detox/thải độc, cam kết kết quả hoặc tạo áp lực mua.
- Nếu khách có bệnh nền, đang mang thai, chọn sản phẩm cho trẻ nhỏ, đang dùng thuốc hoặc có nhu cầu ăn uống đặc biệt, chuyển tư vấn riêng và dùng disclaimer BYT.
- Đây là draft nội dung, cần Brand Checker/Admin duyệt trước khi đăng public.

#### Founder/Admin Confirmation Needed

{blueprint['confirmation']}
"""


def render_pack(
    group_type: str,
    post_count: int,
    products: list[Product],
    total_products: int,
    product_catalog_path: str,
) -> str:
    if not products:
        raise SystemExit("No public-safe products found after compliance filtering.")

    blueprints = build_blueprints()
    if group_type != "all":
        blueprints = [item for item in blueprints if item["lane"] == group_type]
        if not blueprints:
            valid = ", ".join(["all", *LANE_ORDER])
            raise SystemExit(f"Unsupported group type '{group_type}'. Valid values: {valid}")

    selected_products = products[: min(6, len(products))]
    posts = []
    for idx in range(post_count):
        blueprint = blueprints[idx % len(blueprints)]
        product = selected_products[idx % len(selected_products)]
        posts.append(render_post(idx + 1, blueprint, product, product_catalog_path))

    product_lines = "\n".join(
        f"- {product.name} | {product.category} | giá nguồn: {product.retail_price_label}"
        for product in selected_products
    )

    today = date.today().isoformat()
    return f"""# BYT Group Sales Content Pack

- Ngày sinh draft: {today}
- Group type: `{group_type}`
- Số bài: {post_count}
- Tổng sản phẩm trong catalog: {total_products}
- Sản phẩm public-safe sau lọc: {len(products)}
- Output status: Draft, cần admin/founder duyệt trước khi đăng

## Giả Định

- Dùng cho Zalo/Facebook group thuộc hệ sinh thái BYT.
- Chưa có thông tin live về tồn kho, giá hôm nay, khu vực giao, giờ chốt hoặc ưu đãi.
- Không tự dùng ảnh khách hàng/feedback/QR/logo đối tác nếu chưa có quyền.

## Sản Phẩm Tham Chiếu Được Chọn

{product_lines}

## Posts

{chr(10).join(posts)}

## Brand Checker Handoff

- Output type: Group post content pack
- Intended channel: Zalo/Facebook group
- Intended objective: Tương tác, kéo inbox, chuyển đổi mềm
- Concerns: giá/ưu đãi/tồn kho/QR/ảnh/feedback/chính sách cần xác nhận trước khi đăng

## File Nguồn Cần Đối Chiếu

- `BRAND_CONTEXT_SUMMARY.md`
- `brand-brain/13-group-sales-content-brain.md`
- `prompts/group-sales-content-agent.md`
- `brand-data/sources/source-index.json`
- `brand-data/compliance-rules.json`
"""


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate BYT group sales content draft pack.")
    parser.add_argument(
        "--group-type",
        default="all",
        choices=["all", *LANE_ORDER],
        help="Group lane to generate. Default: all.",
    )
    parser.add_argument("--posts", type=int, default=7, help="Number of posts to generate. Default: 7.")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT.relative_to(ROOT)),
        help="Output markdown path relative to repo root. Default: outputs/group-content-pack.sample.md.",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.posts <= 0:
        raise SystemExit("--posts must be greater than 0")

    blocked_terms = build_blocked_terms()
    product_catalog_path = latest_product_catalog_path()
    products, total_products = load_products(product_catalog_path, blocked_terms)
    markdown = render_pack(args.group_type, args.posts, products, total_products, product_catalog_path)

    output_path = ROOT / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8", newline="\n")

    print(f"Wrote {output_path.relative_to(ROOT)}")
    print(f"Public-safe products: {len(products)}/{total_products}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
