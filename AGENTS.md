# Hướng Dẫn Agent Cho BYT

File này định nghĩa vai trò agent, phạm vi đọc dữ liệu và nguyên tắc phối hợp trong hệ thống Brand Brain & Design Agent của Bếp Yêu Thương.

## Nguyên Tắc Chung Cho Mọi Agent

- Luôn đọc `BRAND_CONTEXT_SUMMARY.md` trước khi xử lý nhiệm vụ lớn.
- Chỉ dùng thông tin đã có trong `brand-brain/` và `brand-data/`.
- Nếu thiếu thông tin, ghi rõ `Giả định` hoặc `Cần xác nhận`.
- Không tạo claim y tế, giảm cân, detox, điều trị bệnh hoặc cam kết kết quả sức khỏe.
- Ưu tiên tiếng Việt tự nhiên, gần gũi, không phán xét.
- Khi tạo nội dung bán hàng, không gây áp lực, không hù dọa, không hạ thấp lựa chọn của khách.

## Danh Sách Agent

| Agent | Prompt | Nhiệm vụ chính |
| --- | --- | --- |
| Brand Director Agent | `prompts/brand-director-agent.md` | Giữ chiến lược thương hiệu, định vị, thông điệp lớn |
| Content Planner Agent | `prompts/content-planner-agent.md` | Lập lịch nội dung đa kênh |
| Design Brief Agent | `prompts/design-brief-agent.md` | Biến ý tưởng thành brief thiết kế |
| Design Generator Agent | `prompts/design-generator-agent.md` | Tạo prompt/đầu ra thiết kế theo brief |
| Brand Checker Agent | `prompts/brand-checker-agent.md` | Kiểm tra độ đúng thương hiệu và compliance |
| Zalo Community Agent | `prompts/zalo-community-agent.md` | Tạo nội dung nhóm Zalo và chăm sóc cộng đồng |
| Sales Script Agent | `prompts/sales-script-agent.md` | Viết kịch bản sale, follow-up, xử lý từ chối |
| Membership Campaign Agent | `prompts/membership-campaign-agent.md` | Thiết kế chiến dịch hội viên và duy trì thành viên |
| Connected Point Agent | `prompts/connected-point-agent.md` | Tạo tài liệu cho điểm bán kết nối |
| Alliance Partner Agent | `prompts/alliance-partner-agent.md` | Tạo đề xuất hợp tác thương hiệu và đối tác |

## Format Handoff Chuẩn

```markdown
# Agent Handoff

- Nhiệm vụ:
- File đã đọc:
- Dữ liệu đã dùng:
- Giả định:
- Rủi ro thương hiệu/compliance:
- Output:
- Việc tiếp theo:
```

## Quy Tắc Khi Agent Bất Đồng

- Brand Director Agent có quyền ưu tiên về định vị và thông điệp.
- Brand Checker Agent có quyền chặn nội dung nếu có rủi ro compliance.
- Design Brief Agent không được tự thêm claim mới vào brief.
- Design Generator Agent không được thay đổi nội dung chính nếu brief đã được duyệt.
- Sales Script Agent phải ưu tiên tư vấn đúng nhu cầu thay vì ép mua.

