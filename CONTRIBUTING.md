# Hướng Dẫn Đóng Góp

Tài liệu này giúp đội ngũ và AI agent cập nhật repo BYT Brand Brain một cách nhất quán.

## Nguyên Tắc

- Viết bằng tiếng Việt, rõ ý, dễ tái sử dụng.
- Phân biệt rõ thông tin đã xác nhận và giả định.
- Không thêm claim sức khỏe, giá, thành phần, chứng nhận, thu nhập hoặc chính sách bán hàng khi chưa có nguồn xác nhận.
- Cập nhật vào đúng nguồn sự thật thay vì lặp lại ở nhiều nơi.
- Giữ nội dung phù hợp với BYT: ấm áp, thực tế, tự nhiên, không phán xét.

## Cách Chọn Nơi Cập Nhật

- Chiến lược thương hiệu: `brand-brain/01-brand-dna.md`
- Khách hàng: `brand-brain/02-customer-brain.md`
- Sản phẩm và membership: `brand-brain/03-product-membership-brain.md`
- Mô hình kinh doanh: `brand-brain/04-business-model-brain.md`
- Visual: `brand-brain/05-visual-brain.md`
- Giọng nói và thông điệp: `brand-brain/06-voice-messaging-brain.md`
- Chiến dịch: `brand-brain/07-campaign-brain.md`
- Kênh và cộng đồng: `brand-brain/08-channel-community-brain.md`
- Sale/leader/affiliate: `brand-brain/09-sales-leader-affiliate-brain.md`
- Điểm bán và đối tác: `brand-brain/10-connected-point-alliance-brain.md`
- Compliance: `brand-brain/11-compliance-rule-brain.md`
- Cách agent vận hành: `brand-brain/12-agent-operating-brain.md`

## Quy Ước Tên

- Folder: `kebab-case`
- Markdown: `kebab-case.md`
- File Brand Brain có số thứ tự hai chữ số
- JSON field: `camelCase`
- ID/slug: `kebab-case`, không dấu, ASCII
- Ngày tháng: `YYYY-MM-DD`

## Checklist Trước Khi Hoàn Tất

- Nội dung đúng file nguồn sự thật.
- Không có claim chưa kiểm chứng.
- Ví dụ tiếng Việt tự nhiên.
- Nếu có dữ liệu JSON, file parse hợp lệ.
- Nếu thêm agent mới, đã cập nhật `AGENTS.md`.
- Nếu thêm schema mới, đã cập nhật `schemas/README.md`.

## Kiểm Tra JSON

```powershell
Get-ChildItem -Path .\brand-data, .\schemas -Filter *.json -Recurse | ForEach-Object {
  $null = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
  $_.FullName
}
```

