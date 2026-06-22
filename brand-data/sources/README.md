# Brand Data Sources

Thư mục này lưu snapshot nguồn từ Google Drive/Sheets để repo trở thành kho lưu trữ kiểm chứng được cho dữ liệu brand, sản phẩm và vận hành BYT.

## Cách Dùng

- Điểm vào ổn định: `brand-data/sources/source-index.json`
- Snapshot mới nhất: `brand-data/sources/latest.json`
- Manifest chi tiết snapshot mới nhất: `brand-data/sources/2026-06-22/source-manifest.json`
- Bảng CSV trích xuất từ Google Sheets: `brand-data/sources/2026-06-22/extracted/csv/`
- JSON sản phẩm/giá/công thức đã normalize từ CSV nguồn: `brand-data/sources/2026-06-22/extracted/product-catalog-normalized.json`
- Text trích xuất từ PDF hoa hồng: `brand-data/sources/2026-06-22/extracted/commission-policy.txt`
- Ảnh/menu sản phẩm: `assets/menu-product-images/2026-06-22/`

## Nguồn Đã Nhập

| Vai trò | Nguồn | Bản local |
| --- | --- | --- |
| Danh mục sản phẩm, mô tả, giá, công thức | `https://docs.google.com/spreadsheets/d/1sisaPBk6rqFBCU-C1L-yXjHR_7lCV95KaB2DQuALbQY/edit?usp=sharing` | `2026-06-22/spreadsheets/product-catalog-pricing-recipes.xlsx` |
| Chính sách hoa hồng sale/leader | `https://drive.google.com/file/d/1FvZX_yx6dBVgWCiU429F1Pqpxur4JLou/view?usp=sharing` | `2026-06-22/documents/commission-policy.pdf` |
| Membership, CTV, hoa hồng, đối tác | `https://docs.google.com/spreadsheets/d/1U73iQWNULe8Ki3CWKJKfdtm2yduhg8OVWP6OZmPfqSA/edit?usp=sharing` | `2026-06-22/spreadsheets/membership-commission-partners.xlsx` |
| Kho menu và hình ảnh sản phẩm | `https://drive.google.com/drive/folders/1CiXLKeUPxDpVF0HpX916zSTYjgNpHGUT?usp=sharing` | `../../assets/menu-product-images/2026-06-22/` |
| Group Zalo và kho content Zalo | `https://docs.google.com/spreadsheets/d/1yyGp3G2qy5IQZly3UxPpgsXixn3VXsbgkb8vrnYMx3s/edit?usp=sharing` | `2026-06-22/spreadsheets/zalo-content-community.xlsx` |

## Quy Tắc

- Snapshot là nguồn tham chiếu thô; không tự động ghi đè `brand-data/products.json`, `memberships.json` hoặc các Brand Brain markdown.
- Khi cập nhật JSON chính, cần đọc CSV/PDF từ snapshot và ghi rõ phần nào là dữ liệu đã xác nhận, giả định hoặc cần xác nhận.
- Không dùng nội dung public nếu chưa kiểm tra guardrail trong `BRAND_CONTEXT_SUMMARY.md` và `brand-brain/11-compliance-rule-brain.md`.
- Dữ liệu CTV/đối tác/hoa hồng có thể chứa thông tin vận hành nhạy cảm; không copy ra nội dung public.

## Refresh Snapshot

1. Tải lại các file Drive/Sheets vào một thư mục ngày mới dưới `brand-data/sources/YYYY-MM-DD/`.
2. Nếu cần trích xuất PDF, cài dependency local:

```powershell
python -m pip install pypdf
```

3. Chạy:

```powershell
python scripts\extract_source_workbooks.py <xlsx...> --out brand-data\sources\YYYY-MM-DD\extracted\csv --summary brand-data\sources\YYYY-MM-DD\extracted\workbook-summary.json
python scripts\extract_pdf_text.py brand-data\sources\YYYY-MM-DD\documents\commission-policy.pdf --out brand-data\sources\YYYY-MM-DD\extracted\commission-policy.txt
python scripts\normalize_product_catalog.py --price-csv brand-data\sources\YYYY-MM-DD\extracted\csv\product-catalog-pricing-recipes\01-danh-muc-sp-gia.csv --recipe-csv brand-data\sources\YYYY-MM-DD\extracted\csv\product-catalog-pricing-recipes\03-danh-muc-sp-cong-thuc-quy-tr.csv --out brand-data\sources\YYYY-MM-DD\extracted\product-catalog-normalized.json
```

4. Cập nhật `source-manifest.json`, `source-index.json` và manifest ảnh với size/hash mới.
