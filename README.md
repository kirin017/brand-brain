# Bếp Yêu Thương Brand Brain & Design Agent System

Đây là kho nguồn sự thật cho **Bếp Yêu Thương (BYT)**: một hệ sinh thái F&B lành mạnh theo mô hình **B2B2C**, kết hợp sản phẩm ăn/uống tốt hơn, cộng đồng chăm sóc sức khỏe chủ động, membership, đội ngũ đại sứ/leader/sale/affiliate, điểm bán liên kết và hợp tác thương hiệu.

Kho này phục vụ cả con người và AI agent. Con người dùng để thống nhất chiến lược thương hiệu, nội dung, bán hàng và vận hành cộng đồng. AI agent dùng để tạo brief, nội dung, thiết kế, kịch bản sale, tài liệu leader, chiến dịch membership, nội dung Zalo, tài liệu điểm bán và kiểm tra độ đúng thương hiệu.

## Phạm Vi Hiện Tại

Tập trung vào:

- Brand Brain cho BYT
- Dữ liệu nền dạng JSON
- Prompt khởi tạo cho các agent
- Ví dụ đầu ra tốt/xấu
- Quy ước tài liệu và cách đóng góp
- Guardrail truyền thông sức khỏe/wellness

Chưa làm:

- Không xây web app
- Không kết nối API ngoài
- Không tạo automation production
- Không lưu dữ liệu khách hàng thật
- Không tạo tài sản thiết kế cuối cùng

## Cấu Trúc Thư Mục

```text
.
├── README.md
├── AGENTS.md
├── BRAND_CONTEXT_SUMMARY.md
├── CONTRIBUTING.md
├── brand-brain/
├── brand-data/
├── prompts/
├── schemas/
├── docs/
├── examples/
├── assets/
├── templates/
├── outputs/
├── scripts/
└── app-later/
```

## Các Lớp Nguồn Sự Thật

### `brand-brain/`

Chứa tài liệu chiến lược dạng markdown. Đây là nơi trả lời các câu hỏi: BYT là ai, phục vụ ai, nói như thế nào, thiết kế ra sao, vận hành cộng đồng và bán hàng theo nguyên tắc nào.

### `brand-data/`

Chứa dữ liệu nền dạng JSON để agent và công cụ sau này có thể đọc được: sản phẩm, membership, phân khúc khách hàng, kênh, campaign, luật giọng nói, luật compliance và rubric kiểm tra thương hiệu.

### `prompts/`

Chứa prompt khởi tạo cho từng agent chuyên trách: Brand Director, Content Planner, Design Brief, Design Generator, Brand Checker, Zalo Community, Sales Script, Membership Campaign, Connected Point và Alliance Partner.

### `schemas/`

Chứa JSON Schema để chuẩn hóa output có cấu trúc. Khi agent tạo JSON, cần bám theo schema tương ứng nếu có.

### `examples/`

Chứa ví dụ đầu ra tốt/xấu để agent học tiêu chuẩn thực thi của BYT.

### `assets/`, `templates/`, `outputs/`, `scripts/`, `app-later/`

Các thư mục dự phòng cho giai đoạn sau. Hiện chỉ có tài liệu hướng dẫn, chưa có app hoặc automation.

## BYT Trong Một Câu

> Bếp Yêu Thương giúp gia đình Việt và phụ nữ bận rộn ăn lành, uống sạch và sống yêu thương hơn thông qua sản phẩm F&B tử tế, cộng đồng chăm sóc sức khỏe chủ động và mạng lưới đối tác bán hàng gần gũi.

## Nguyên Tắc Làm Việc

- Viết tài liệu bằng tiếng Việt, rõ ràng, dễ dùng.
- Phân biệt rõ `đã xác nhận`, `giả định`, và `cần founder xác nhận`.
- Không tự bịa thông tin sản phẩm, giá, thành phần, chứng nhận, công dụng sức khỏe hoặc chính sách bán hàng.
- Không dùng ngôn ngữ gây sợ hãi, body shaming, detox cực đoan, giảm cân thần tốc hoặc claim điều trị bệnh.
- Khi thiếu dữ liệu, agent phải nêu giả định và đề xuất câu hỏi cần xác nhận.
- Nội dung phải phù hợp với phụ nữ bận rộn, gia đình Việt, cộng đồng Zalo và mô hình bán hàng cộng tác.

## Quy Trình Dành Cho Con Người

1. Đọc `BRAND_CONTEXT_SUMMARY.md` để nắm bối cảnh nhanh.
2. Cập nhật quyết định chiến lược trong `brand-brain/`.
3. Cập nhật dữ liệu có cấu trúc trong `brand-data/`.
4. Dùng `examples/` để chuẩn hóa chất lượng đầu ra.
5. Khi thêm agent mới, cập nhật `AGENTS.md` và thêm prompt vào `prompts/`.
6. Khi thêm dạng output JSON mới, cập nhật hoặc thêm schema trong `schemas/`.

## Quy Trình Dành Cho AI Agent

1. Xác định nhiệm vụ.
2. Đọc `BRAND_CONTEXT_SUMMARY.md`.
3. Đọc file Brand Brain liên quan trong `brand-brain/`.
4. Đọc dữ liệu JSON liên quan trong `brand-data/` nếu cần.
5. Dùng prompt chuyên trách trong `prompts/`.
6. Tạo output theo format yêu cầu.
7. Tự kiểm tra bằng guardrail trong `11-compliance-rule-brain.md` và rubric trong `brand-data/brand-check-rubric.json`.

## Định Nghĩa Hoàn Thành Cho Repo Này

Repo được xem là đúng hướng khi:

- Phản ánh BYT là hệ sinh thái F&B lành mạnh, chủ động phòng ngừa và chăm sóc sức khỏe theo mô hình B2B2C.
- Có cấu trúc cho membership, ambassador, leader, sale, affiliate, điểm bán kết nối, cộng đồng Zalo và hợp tác thương hiệu.
- Có guardrail truyền thông sức khỏe/wellness.
- Hữu ích cho cả người vận hành thương hiệu và AI agent.
- Chưa triển khai web app hoặc kết nối API ngoài.
