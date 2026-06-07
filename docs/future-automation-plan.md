# Kế Hoạch Tự Động Hóa Tương Lai Cho BYT Brand Brain

Tài liệu này mô tả hướng kết nối tương lai giữa BYT Brand Brain và các công cụ thiết kế như Canva, Figma hoặc image generation tool. Phase 1 hiện có thể tạo local `final.png` sau human approval, nhưng **chưa tích hợp API ngoài**, chưa lưu lên Google Drive và chưa tự động xuất bản. Mục tiêu là chuẩn hóa luồng dữ liệu để sau này kết nối an toàn, có kiểm duyệt và đúng thương hiệu.

## Mục Tiêu

BYT cần một hệ thống có thể chuyển dữ liệu thương hiệu thành đầu ra thiết kế hằng ngày mà vẫn giữ được:

- Tinh thần ấm áp, tự nhiên, đáng tin và cộng đồng.
- Định vị BYT là hệ sinh thái F&B lành mạnh, wellness chủ động, membership và B2B2C.
- Tính chính xác của sản phẩm, membership, kênh, offer và CTA.
- Guardrail sức khỏe/wellness, không claim y tế hoặc cam kết kết quả.
- Quy trình human approval trước khi xuất bản.

## Luồng Tự Động Hóa Đề Xuất

```text
Brand Brain
→ Campaign brief
→ Content angle
→ Design brief
→ Image/layout prompt
→ Brand Checker
→ Human approval
→ Export
→ Save to Drive
→ Publish
```

## Phase Đầu Tiên Được Ưu Tiên: HTML-To-Image Cho Facebook Square

BYT sẽ ưu tiên HTML-to-image cho Facebook square post trước khi kết nối Canva/Figma/image generation API. Lý do:

- Agent viết HTML/CSS ổn định hơn so với tạo ảnh bằng prompt tự do.
- Text tiếng Việt, CTA, layout, badge và Brand Checker dễ kiểm soát hơn.
- Sản phẩm F&B cần ảnh thật hoặc asset đã duyệt, không nên để AI tự bịa sản phẩm/bao bì.
- HTML render có thể xuất `render.html`, `rendered.png`, `metadata.json`, `brand-check.md`, `approval.json` và sau duyệt là `final.png`.

Luồng ưu tiên:

```text
Brand Brain
→ Brand Brain Generator
→ Text Brand Checker
→ Template Selector
→ Approved Asset Selector
→ HTML Render
→ Visual QA
→ Human Approval
→ Export final.png
```

Quy tắc:

- Không có asset bắt buộc đã duyệt thì không xuất final.
- Compliance risk `High` thì không render final.
- Ảnh AI chỉ được dùng nếu đã qua duyệt và được ghi vào `brand-data/assets.json` với status `approved`.

## Phase 1 HTML Template Design System

The first production path uses local HTML templates, structured asset tags, Visual QA, and human approval before final PNG export. External Canva, Figma, image generation, and Zalo publishing remain outside Phase 1.

## Vai Trò Từng Bước

### 1. Brand Brain

Nguồn dữ liệu chính:

- `BRAND_CONTEXT_SUMMARY.md`
- `brand-brain/`
- `brand-data/`
- `templates/`
- `prompts/`
- `examples/`

Agent hoặc app phải đọc Brand Brain trước khi tạo bất kỳ prompt thiết kế nào. Không được xử lý BYT như một thương hiệu đồ uống healthy generic.

### 2. Campaign Brief

Campaign brief xác định:

- Mục tiêu campaign.
- Sản phẩm hoặc membership.
- Tệp khách hàng.
- Kênh.
- Offer/CTA nếu có.
- Rủi ro compliance.
- Thông tin nào cần founder xác nhận.

Ví dụ campaign:

- Giọt Lành membership.
- Ban Mai breakfast.
- Bình Minh morning routine.
- Mặt Trời Bé Con cho gia đình.
- CTV/Affiliate recruitment.
- Connected point opening.
- Brand alliance invitation.

### 3. Content Angle

Content angle biến mục tiêu campaign thành một góc nói cụ thể, ví dụ:

- "Bữa sáng lành hơn cho ngày bận rộn."
- "Không cần hoàn hảo, bắt đầu bằng một lựa chọn uống sạch hơn."
- "Điểm bán kết nối là điểm chạm cộng đồng, không chỉ là nơi đặt banner."
- "Cùng BYT tạo thêm giá trị chăm sóc chủ động cho cộng đồng chung."

Content angle phải tránh:

- Hù dọa sức khỏe.
- Body shaming.
- Claim giảm cân/detox.
- Hứa doanh thu hoặc thu nhập.

### 4. Design Brief

Design brief chuẩn hóa đầu vào cho Canva/Figma/image generation:

- Main message.
- Headline.
- Supporting copy.
- CTA.
- Layout.
- Visual style.
- Product/membership accuracy check.
- Compliance check.
- Founder confirmation needed.

Nguồn template nên dùng:

- `templates/design-brief-template.md`
- `templates/daily-design-request-template.md`

### 5. Image/Layout Prompt

Từ design brief, hệ thống tạo prompt cho từng công cụ:

- Canva: hướng dẫn tạo layout chỉnh sửa được.
- Figma: hướng dẫn frame, component, spacing, hierarchy.
- Image generation: prompt tạo ảnh nền/ảnh concept/ảnh sản phẩm minh họa, không dùng logo hoặc bao bì chưa xác nhận.

Mỗi prompt bắt buộc có:

- Brand context.
- Audience.
- Product/membership.
- Channel.
- Format.
- Main message.
- Visual style.
- Layout.
- Colors.
- Typography direction.
- Required elements.
- Forbidden elements.
- Compliance notes.

### 6. Brand Checker

Trước khi gửi cho người duyệt, mọi output phải qua Brand Checker:

- Brand fit.
- Visual fit.
- Voice fit.
- Business model fit.
- Product accuracy.
- Membership accuracy.
- Community fit.
- Conversion clarity.
- Channel fit.
- Compliance risk.

Nếu compliance risk là `High`, output phải bị reject hoặc viết lại trước khi founder/admin duyệt.

### 7. Human Approval

Human approval bắt buộc khi có:

- Logo, QR, màu, font, packaging hoặc ảnh sản phẩm chính thức.
- Giá, quyền lợi membership, chính sách sale/CTV/leader/affiliate.
- POSM, connected point hoặc partner proposal.
- Nội dung liên quan trẻ em, mẹ bầu, người bệnh, thuốc, bệnh nền.
- Nội dung có brand alliance hoặc logo đối tác.
- Claim sức khỏe/wellness nhạy cảm.

### 8. Export

Tương lai có thể export:

- PNG/JPG cho social.
- PDF cho proposal/POSM.
- Canva design link.
- Figma file/frame link.
- Markdown brief.
- JSON metadata để tracking.

### 9. Save To Drive

Sau khi human approval, hệ thống có thể lưu vào Drive theo convention:

```text
BYT/YYYY-MM/Campaign/Channel/Format/
```

Tên file đề xuất:

```text
YYYY-MM-DD_BYT_[campaign]_[channel]_[format]_[status]
```

Ví dụ:

```text
2026-06-04_BYT_giot-lanh_facebook_square_approved
```

### 10. Publish

Publish chỉ nên chạy sau khi:

- Brand Checker đã pass.
- Founder/admin đã duyệt nếu có thông tin nhạy cảm.
- Link/QR/CTA đã kiểm tra.
- Channel format đã đúng.
- File đã lưu vào Drive hoặc output archive.

## Loại Asset Cần Hỗ Trợ

| Asset | Kênh | Mục tiêu |
| --- | --- | --- |
| Daily social post | Facebook | Nội dung hằng ngày, giáo dục nhẹ, trust, sản phẩm, cộng đồng |
| Zalo banner | Zalo group/OA | Nhắc thói quen, membership, challenge, deal đã duyệt |
| Reel cover | TikTok/Reels | Hook ngắn, rõ, mobile-first |
| Membership campaign | Facebook/Zalo/POSM | Giới thiệu Giọt Lành, Ban Mai, Bình Minh, Mặt Trời |
| POSM connected point | Điểm bán kết nối | QR, giới thiệu BYT, CTA cộng đồng |
| QR card | POSM/điểm bán | Dẫn vào Zalo/community/membership |
| Sale kit | Sale/CTV/Leader | Script, FAQ, guardrail, bảng đúng/sai |
| Partner proposal visual | Brand alliance | Mời hợp tác, giải thích giá trị chung |

## Visual Guardrails Bắt Buộc

Nên giữ:

- Ấm áp, tự nhiên, đáng tin.
- Healthy nhưng không cực đoan.
- Có cảm giác cộng đồng, gia đình Việt, phụ nữ bận rộn.
- Sản phẩm rõ, CTA rõ.
- Ít chữ, ưu tiên đọc trên mobile.
- Bối cảnh đời sống thật: bếp, bàn ăn, văn phòng, điểm bán, nhóm cộng đồng.

Không dùng:

- Hospital/medical style.
- Bác sĩ, thuốc, biểu tượng y tế để quảng bá sản phẩm.
- Extreme fitness/gym style.
- Body transformation hoặc before/after.
- Fake luxury.
- Neon colors.
- Generic stock-photo feeling.
- Quá nhiều chữ trên thiết kế.
- Logo, QR, màu, font, bao bì chưa xác nhận như tài sản chính thức.

## Quy Tắc Cho Canva

Canva nên dùng cho:

- Social post.
- Zalo banner.
- POSM cơ bản.
- QR card.
- Sale kit đơn giản.
- Partner one-page visual.

Prompt Canva phải yêu cầu:

- Thiết kế có thể chỉnh sửa.
- Layer text rõ ràng.
- Mobile readability.
- Không tự tạo logo/màu/font chính thức.
- Đánh dấu `Cần founder xác nhận` ở phần asset thiếu.

Template nguồn:

- `templates/canva-prompt-template.md`

## Quy Tắc Cho Figma

Figma nên dùng cho:

- Layout system.
- Component/template lặp lại.
- Sale kit nhiều trang.
- Partner proposal visual.
- POSM có nhiều biến thể.

Instruction Figma phải yêu cầu:

- Frame size rõ.
- Auto layout nếu phù hợp.
- Text hierarchy rõ.
- Component hóa CTA, badge, QR placeholder, product card.
- Placeholder cho logo/QR/ảnh sản phẩm nếu chưa xác nhận.

Template nguồn:

- `templates/figma-layout-instruction-template.md`

## Quy Tắc Cho Image Generation

Image generation chỉ nên dùng cho:

- Ảnh minh họa concept.
- Background đời sống.
- Mood visual.
- Cảnh bếp/văn phòng/cộng đồng/điểm bán.

Không dùng image generation để:

- Tự tạo logo BYT.
- Tự tạo bao bì chính thức.
- Tạo QR thật.
- Tạo ảnh sản phẩm như thật nếu sản phẩm/packaging chưa xác nhận.
- Tạo ảnh trẻ em/khách hàng thật nếu chưa có quyền và approval.

Template nguồn:

- `templates/image-generation-prompt-template.md`

## Compliance Cho Prompt Thiết Kế

Mọi prompt phải ghi rõ:

- Không claim chữa bệnh.
- Không claim điều trị/phòng bệnh.
- Không cam kết giảm cân.
- Không dùng miracle detox/thải độc.
- Không claim tiểu đường, mỡ máu, gan, mất ngủ, tiêu hóa, miễn dịch nếu chưa được duyệt chuyên môn.
- Không hứa thu nhập/doanh thu/lợi nhuận cho CTV/Sale/Leader/điểm bán.
- Nếu có trẻ em, mẹ bầu, người bệnh, thuốc hoặc nhu cầu ăn uống đặc biệt: cần human approval.

## Dữ Liệu Cần Xác Nhận Trước Khi Tự Động Hóa Thật

- Logo chính thức và logo variants.
- Brand color palette và HEX.
- Font chính thức.
- Quy tắc layout/logo lockup/slogan.
- Ảnh sản phẩm chính thức.
- Bao bì chính thức.
- QR/link chính thức cho từng cộng đồng/kênh.
- Giá, quyền lợi membership, duration.
- Chính sách CTV/Sale/Leader/Affiliate.
- Chính sách connected point.
- Điều kiện brand alliance và co-branding.
- Quy trình duyệt nội bộ và người chịu trách nhiệm.

## Giai Đoạn Triển Khai Đề Xuất

### Phase 1: Manual Prompt Workflow

- App tạo design brief và prompt markdown.
- Designer copy prompt vào Canva/Figma/image tool.
- Brand Checker chạy thủ công trong app.
- Founder/admin duyệt thủ công.

### Phase 2: Semi-Automated Export

- App tạo prompt và metadata JSON.
- Designer chọn template Canva/Figma đã có.
- Output lưu vào `outputs/`.
- Drive upload vẫn làm thủ công hoặc bằng script nội bộ sau khi duyệt.

### Phase 3: API Connection

Chỉ triển khai khi đã có:

- Brand assets chính thức.
- Quy trình approval rõ.
- API credentials an toàn.
- Logging và rollback.
- Quy tắc phân quyền.

### Phase 4: Publishing Workflow

- Kết nối lịch nội dung.
- Save to Drive tự động.
- Publish hoặc schedule sau approval.
- Lưu Brand Checker report kèm asset.

## Trạng Thái Hiện Tại

- Chưa tích hợp Canva API.
- Chưa tích hợp Figma API.
- Chưa tích hợp image generation API.
- Chưa tích hợp Google Drive.
- Chưa publish tự động.
- Tất cả prompt/template dưới đây là tài liệu chuẩn bị cho automation tương lai.
