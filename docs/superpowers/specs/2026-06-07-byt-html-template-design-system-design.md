# BYT HTML Template Design System - Design Spec

## Muc Tieu

Xay dung he thong tao anh bang HTML cho Bep Yeu Thuong theo huong co bo template thiet ke ro rang, thay vi dung mot layout chung cho moi noi dung.

He thong nay giup BYT tao anh social/POSM noi bo nhanh hon, van giu san pham that, logo that, copy an toan compliance va co buoc human approval truoc khi ra `final.png`.

## Pham Vi Phase 1

Phase 1 tap trung vao HTML Template Design System lam loi.

Can tao cac template theo ngu canh BYT:

- `ban-mai-breakfast`: bai Facebook/Zalo ve bua sang, yen mach, thoi quen buoi sang.
- `giot-lanh-membership`: bai membership, loi ich dong hanh va thoi quen lanh.
- `product-focus-drink`: bai san pham do uong/sua hat/ginger shot/detox voi claim an toan.
- `an-lanh-song-khoe-community`: bai nhom ve an lanh, song khoe, thoi quen nho moi ngay; community-first, khong product-first.
- `zalo-community`: banner/post cong dong, khong qua ban hang.
- `sale-ctv-recruitment`: noi dung tuyen CTV/sale/ambassador, khong hua thu nhap.
- `connected-point-posm`: POSM/QR card diem ban ket noi.
- `brand-alliance`: visual moi hop tac doi tac, deal minh bach.

Khong mo rong sang publish Zalo, Canva API, Figma API, hoac image generation trong Phase 1.

## Van De Hien Tai

Output HTML render hien tai da chay duoc ve ky thuat, nhung chua dat ky vong thiet ke:

- Layout con generic, thieu art direction rieng cho tung campaign.
- Asset selection con dua vao text trong `usage_notes`, de gan anh khong dung ngu canh.
- Copy tren anh co the mang tinh noi bo, vi du dong `Tone: ...`, thay vi copy publication-ready.
- Template chua co bien the A/B/C de so sanh.
- Visual QA da bat duoc loi anh khong load va text overflow, nhung chua danh gia duoc muc do dung mood/brand.

## Giai Phap Duoc Duyet

Dung HTML Template Design System lam loi:

1. User nhap goal, product/membership, channel, format, offer, CTA, tone, notes.
2. Brand generator tao output co copy publication-ready.
3. Template selector chon template theo campaign/product/channel.
4. Asset matcher chon anh theo tag co cau truc, khong chon theo usage note mo ho.
5. Renderer tao HTML va PNG nhap.
6. Visual QA kiem tra size, anh load, text overflow, copy length va compliance-safe text.
7. Human approval moi tao `final.png`.

## Asset Metadata Moi

Can mo rong `brand-data/assets.json` hoac tach thanh schema rieng neu file qua lon.

Moi asset nen co them cac truong:

- `product_tags`: vi du `["ban_mai", "yen_mach", "breakfast"]`.
- `campaign_tags`: vi du `["ban_mai_breakfast", "morning_routine", "an_lanh_song_khoe"]`.
- `visual_tags`: vi du `["warm", "natural", "product_clear", "family_safe", "community_first"]`.
- `best_for`: danh sach ngu canh nen dung.
- `avoid_for`: danh sach ngu canh khong nen dung.
- `approval_scope`: noi ro approved cho test noi bo, public, hay campaign cu the.

Nguyen tac: mot asset chi duoc dung neu `status = approved`, `founder_confirmation_needed = false`, va tag khop voi template/campaign dang render.

## Template Model

Moi template can khai bao:

- `id`
- `label`
- `supported_formats`
- `required_asset_slots`
- `optional_asset_slots`
- `max_lengths`
- `brand_risk_notes`
- `allowed_output_types`
- `layout_rules`

Template khong tu them claim moi. Template chi hien thi payload da duoc generator/brand checker tao ra.

## Data Flow

Input form/API:

`GenerationInput -> GeneratedOutput -> RenderPlan -> TemplatePayload -> HTML -> VisualQA -> Archive -> Approval -> final.png`

Trong do:

- `GeneratedOutput` phai tao copy dung publication-ready.
- `RenderPlan` chiu trach nhiem chon template va asset.
- `TemplatePayload` chua noi dung da cat gon cho anh.
- `VisualQA` chan output neu anh loi, text tran, copy qua dai, hoac co text noi bo.
- `Approval` la buoc bat buoc truoc khi tao final.

## Visual Direction Phase 1

BYT can giu cam giac:

- am ap
- tu nhien
- dang tin
- gan voi thoi quen lanh cua gia dinh/Vietnamese busy women
- san pham ro, khong giong benh vien, gym cuc doan, luxury gia, neon, stock photo chung chung

Vi chua co mau/font/logo rules chinh thuc, template tiep tuc dung token tam thoi va ghi ro can founder xac nhan khi publish public.

## Error Handling

He thong can tra ve trang thai ro:

- `blocked_for_missing_asset`: thieu asset approved/tag dung.
- `blocked_for_compliance`: copy co risk cao.
- `failed_visual_qa`: render duoc nhung anh/chu/layout khong dat.
- `needs_human_approval`: da render nhap, can duyet.
- `approved`: da tao final.
- `rejected`: bi nguoi duyet tu choi.

Neu asset khong khop tag, khong fallback sang anh approved bat ky. Tra ve ly do can gan/chon asset dung.

## Testing

Can co test cho:

- template selector chon dung template theo campaign/product.
- template selector chon dung `an-lanh-song-khoe-community` khi input la nhom an lanh/song khoe, khong ep sang template ban san pham.
- asset matcher khong chon asset sai tag.
- moi template render duoc HTML hop le.
- Visual QA bat loi text overflow, anh khong load, copy noi bo.
- approval endpoint khong tao final khi chua co archive hop le.
- smoke render cho it nhat `ban-mai-breakfast` va `giot-lanh-membership`.

## Phase 2: Hybrid Background

Sau khi Phase 1 on dinh, co the them hybrid flow cho campaign lon:

- AI/image tool chi tao background/bai tri khong co logo/san pham gia.
- HTML dat san pham that, logo that, headline, CTA, QR len tren.
- Background phai qua brand/compliance QA va human approval.

Phase 2 khong nam trong implementation dau tien.

## Quyet Dinh

Tien hanh Phase 1 theo huong HTML Template Design System. Day la loi automation dau tien cho BYT vi de kiem soat brand, de test, khong phu thuoc external API va khong lam sai san pham that.
