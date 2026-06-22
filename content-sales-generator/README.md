# Content Sales Generator

Module này giúp BYT tạo draft nội dung đăng group để kéo tương tác, kéo inbox, mua gom, membership, CTV và điểm bán theo đúng giọng thương hiệu.

Đây chưa phải automation production. Output sinh ra là bản nháp, cần admin/founder duyệt trước khi đăng công khai.

## Nguồn Dữ Liệu

- Context thương hiệu: `BRAND_CONTEXT_SUMMARY.md`
- Luật group sales: `brand-brain/13-group-sales-content-brain.md`
- Prompt agent: `prompts/group-sales-content-agent.md`
- Dữ liệu nguồn mới nhất: `brand-data/sources/source-index.json`
- Danh mục sản phẩm chuẩn hóa: `brand-data/sources/2026-06-22/extracted/product-catalog-normalized.json`
- Lịch/pillar Zalo: `brand-data/sources/2026-06-22/extracted/csv/zalo-content-community/`
- Luật compliance: `brand-data/compliance-rules.json`

## Cách Dùng Nhanh

Sinh một pack 7 bài mẫu:

```powershell
python scripts/generate_group_content_pack.py
```

Sinh pack riêng cho nhóm mua gom:

```powershell
python scripts/generate_group_content_pack.py --group-type mua_gom --posts 5 --output outputs/mua-gom-pack.md
```

Sinh pack riêng cho nhóm membership:

```powershell
python scripts/generate_group_content_pack.py --group-type membership --posts 5 --output outputs/membership-pack.md
```

## Group Type Hỗ Trợ

- `all`
- `healthy_living`
- `product_deal`
- `mua_gom`
- `membership`
- `ctv_affiliate`
- `connected_point`

## Quy Trình Khuyến Nghị

1. Chạy script để có draft.
2. Chọn bài phù hợp với lịch đăng thực tế.
3. Điền thông tin live: giá, tồn kho, giờ chốt, khu vực giao, QR hoặc ưu đãi.
4. Dùng `prompts/brand-checker-agent.md` kiểm tra nội dung.
5. Admin/founder duyệt trước khi đăng.

## Ghi Chú Compliance

Script tự lọc sản phẩm có từ khóa rủi ro trong tên, danh mục, mô tả và tệp khách. Tuy vậy, output vẫn là draft. Các trường sau luôn cần xác nhận nếu dùng để đăng:

- Giá, combo, ưu đãi, tồn kho.
- Quyền lợi membership.
- Khu vực giao, giờ chốt, QR.
- Feedback/ảnh khách hàng.
- Chính sách CTV, hoa hồng, điểm bán.
- Nội dung cho trẻ em, mẹ bầu, người có bệnh nền hoặc nhu cầu ăn uống đặc biệt.

Caption sinh ra không tự thêm dòng cuối dạng `Comment ...` và pack mặc định không tạo `Pinned Comment`. Nếu admin muốn kéo comment, hãy thêm CTA riêng theo ngữ cảnh sau khi duyệt.
