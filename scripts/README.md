# Scripts

Thư mục này dành cho script kiểm tra, chuyển đổi hoặc automation trong giai đoạn sau.

Các script hiện có phục vụ trích xuất dữ liệu nguồn và tạo draft nội dung thử nghiệm. Script trong repo không thay thế bước duyệt của admin/founder.

Script hiện có:

- `extract_source_workbooks.py`: trích xuất workbook nguồn sang CSV và summary JSON.
- `extract_pdf_text.py`: trích xuất text từ PDF chính sách.
- `normalize_product_catalog.py`: chuẩn hóa catalog sản phẩm/công thức.
- `generate_group_content_pack.py`: sinh draft gói bài group từ dữ liệu BYT local.

Ví dụ chạy:

```powershell
python scripts/generate_group_content_pack.py --group-type all --posts 7
```

