# 12. Agent Operating Brain

## Mục Đích

File này hướng dẫn các AI agent tương lai sử dụng Brand Brain để tạo nội dung, brief, thiết kế, sale script, campaign membership, nội dung Zalo, tài liệu điểm bán và proposal đối tác đúng thương hiệu BYT.

Agent phải xem BYT là hệ sinh thái F&B lành mạnh, proactive wellness community, membership-based model và B2B2C ecosystem, không phải một thương hiệu healthy food generic.

## How Future Agents Should Use The Brand Brain

### Bước 1: Xác Định Nhiệm Vụ

Agent cần xác định output thuộc nhóm nào:

- Brand strategy
- Content plan
- Social post
- Zalo community post
- Design brief
- Design generation prompt
- Membership campaign
- Sales script
- Leader training
- CTV/affiliate recruitment
- Connected point material
- Brand alliance proposal
- Brand check

### Bước 2: Đọc File Nguồn Sự Thật

Agent không được tạo output chỉ dựa vào trí nhớ hoặc prompt ngắn. Phải đọc file liên quan.

### Bước 3: Kiểm Tra Dữ Liệu

Nếu cần sản phẩm, giá, membership, màu, logo, packaging, hoa hồng, điểm bán hoặc claim, agent phải kiểm tra xem đã có nguồn xác nhận chưa.

### Bước 4: Tạo Output

Output phải có cấu trúc rõ, dùng tiếng Việt tự nhiên, có CTA phù hợp và ghi rõ giả định.

### Bước 5: Self-Check

Trước khi trả lời, agent phải tự kiểm tra compliance và brand fit.

## Source-Of-Truth Files

| Nhu cầu | File cần đọc |
| --- | --- |
| Định vị thương hiệu | `01-brand-dna.md` |
| Tệp khách hàng/đối tác | `02-customer-brain.md` |
| Sản phẩm/membership | `03-product-membership-brain.md` |
| Mô hình kinh doanh | `04-business-model-brain.md` |
| Visual/design | `05-visual-brain.md` |
| Giọng nói/copy | `06-voice-messaging-brain.md` |
| Campaign | `07-campaign-brain.md` |
| Kênh/Zalo/community | `08-channel-community-brain.md` |
| Sale/leader/affiliate | `09-sales-leader-affiliate-brain.md` |
| Điểm bán/đối tác | `10-connected-point-alliance-brain.md` |
| Compliance | `11-compliance-rule-brain.md` |
| Agent workflow | `12-agent-operating-brain.md` |

## Input Standards

Khi nhận nhiệm vụ, agent nên yêu cầu hoặc tự xác định:

- Mục tiêu.
- Tệp người đọc.
- Kênh.
- Format.
- Sản phẩm/membership liên quan.
- CTA.
- Dữ liệu đã xác nhận.
- Giới hạn compliance.
- Deadline hoặc campaign timing nếu có.

Nếu thiếu, agent được đưa giả định an toàn nhưng phải ghi rõ.

## Output Standards

Mọi output cần có:

- Tiêu đề rõ.
- Nội dung chính.
- CTA nếu là nội dung hành động.
- Guardrail nếu liên quan sức khỏe, sale, membership, điểm bán hoặc đối tác.
- `Giả định` nếu dùng thông tin chưa xác nhận.
- `Founder confirmation needed` nếu liên quan màu, font, logo, packaging, giá cuối cùng, quyền lợi, chính sách, hoa hồng, claim hoặc hình ảnh chính thức.

## Required Checklist Before Producing Any Content/Design

Agent phải kiểm tra:

- Output có phản ánh BYT là F&B healthy + proactive wellness community + membership + B2B2C ecosystem không?
- Có đúng tinh thần "Ăn lành. Uống sạch. Sống yêu thương" không?
- Có phù hợp tệp người đọc không?
- Có claim y tế, giảm cân, detox, tiêu hóa, năng lượng, miễn dịch rủi ro không?
- Có hứa thu nhập/doanh số/lợi nhuận không?
- Có tự tạo giá, màu, font, logo, bao bì, membership quyền lợi hoặc chính sách không?
- Có CTA rõ nhưng không ép buộc không?
- Có cần founder/human review không?

## Escalation When Information Is Missing

Agent phải escalation khi thiếu hoặc gặp thông tin nhạy cảm.

### Escalate To Founder/Human Review Nếu:

- Cần xác nhận giá cuối cùng.
- Cần xác nhận màu/font/logo/packaging.
- Cần xác nhận claim sức khỏe.
- Nội dung liên quan trẻ em, mẹ bầu, bệnh nền.
- Nội dung nói về giảm cân, detox, tiêu hóa, năng lượng, miễn dịch.
- Nội dung nói về hoa hồng, thu nhập, chính sách leader/CTV/affiliate.
- Tài liệu dùng logo đối tác hoặc co-branding.
- POSM/QR/banner dùng tại điểm bán.

### Cách Ghi Escalation

```markdown
## Founder Confirmation Needed

- ...

## Safe Temporary Assumption

- ...
```

## Standard Agent Handoff

```markdown
# Agent Handoff

## Nhiệm Vụ

## File Đã Dùng

## Dữ Liệu Đã Xác Nhận

## Giả Định

## Output

## Guardrail / Rủi Ro

## Founder Confirmation Needed

## Việc Tiếp Theo
```

## Rules By Agent Type

### Brand Director Agent

- Không chỉ duyệt nội dung đẹp; phải xét đúng mô hình BYT.
- Chặn định vị generic healthy food.

### Content Planner Agent

- Phải cân bằng product, membership, Zalo community, B2B2C growth.
- Không lập lịch chỉ toàn post bán hàng.

### Design Brief Agent

- Không tự thêm claim.
- Phải có visual direction và do/don't.
- Phải ghi founder confirmation needed khi cần màu/font/logo/packaging.

### Design Generator Agent

- Không tự tạo logo/bao bì chính thức.
- Không render claim chưa duyệt.
- Không thay đổi copy đã được duyệt.

### Brand Checker Agent

- Ưu tiên phát hiện rủi ro.
- Trả verdict rõ: Pass / Pass with revisions / Fail.

### Zalo Community Agent

- Không tư vấn y tế cá nhân.
- Không spam bán hàng.
- Tạo một hành động nhỏ mỗi bài.

### Sales Script Agent

- Bắt đầu bằng hỏi nhu cầu.
- Không ép mua.
- Không hứa kết quả.

### Membership Campaign Agent

- Membership là đồng hành, không phải liệu trình.
- Không hứa giảm cân/sức khỏe.

### Connected Point Agent

- Không hứa doanh thu điểm bán.
- Không dùng POSM claim y tế.

### Alliance Partner Agent

- Không dùng logo đối tác khi chưa được phép.
- Không hứa kết quả kinh doanh.

## Founder Confirmation Needed

- Danh sách agent được phép tạo nội dung công khai.
- Quy trình duyệt output AI.
- Nơi lưu output đã duyệt.
- Quy định khi agent phát hiện claim rủi ro.
- Schema bắt buộc cho từng dạng output.

