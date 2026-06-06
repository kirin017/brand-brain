# JSON Schemas

Thư mục này chứa JSON Schema để chuẩn hóa output có cấu trúc cho hệ thống BYT Brand Brain & Design Agent.

## Quy Ước

- Chuẩn schema: JSON Schema Draft 2020-12
- Tên file: `kebab-case.schema.json`
- Tên field: `camelCase`
- ID/slug: `kebab-case`, không dấu
- Không dùng comment trong file JSON

## Schema Hiện Có

| File | Mục đích |
| --- | --- |
| `brand-brain.schema.json` | Dữ liệu thương hiệu tổng quan |
| `product.schema.json` | Hồ sơ sản phẩm |
| `campaign.schema.json` | Hồ sơ campaign |
| `design-brief.schema.json` | Brief thiết kế |
| `brand-check-result.schema.json` | Kết quả kiểm tra thương hiệu |
| `membership.schema.json` | Hồ sơ membership |
| `customer-segment.schema.json` | Phân khúc khách hàng/đối tác |
| `channel.schema.json` | Cấu hình kênh và vai trò nội dung |
| `partner-material.schema.json` | Tài liệu điểm bán kết nối hoặc đối tác liên minh |

## Quy Tắc Cho Agent

- Nếu output là JSON, cố gắng bám theo schema tương ứng.
- Không tự tạo dữ liệu chưa có trong `brand-data/`.
- Nếu thiếu dữ liệu, dùng `null` hoặc trường `assumptions` thay vì bịa.
- Khi thêm dạng output mới, cân nhắc thêm schema mới.

## Kiểm Tra Cú Pháp

```powershell
Get-ChildItem -Path .\schemas -Filter *.json | ForEach-Object {
  $null = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
  $_.Name
}
```
