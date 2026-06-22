from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def clean(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def read_csv_rows(path: Path) -> list[list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def table_from_csv(path: Path, header_row_index: int) -> list[dict[str, str]]:
    rows = read_csv_rows(path)
    if len(rows) <= header_row_index:
        return []

    headers = [clean(value) for value in rows[header_row_index]]
    records = []
    for row in rows[header_row_index + 1 :]:
        if not any(clean(value) for value in row):
            continue

        record: dict[str, str] = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            record[header] = clean(row[index]) if index < len(row) else ""
        records.append(record)
    return records


def fill_down(records: list[dict[str, str]], fields: list[str]) -> None:
    current = {field: "" for field in fields}
    for record in records:
        for field in fields:
            if record.get(field):
                current[field] = record[field]
            else:
                record[field] = current[field]


def product_key(record: dict[str, str]) -> str:
    return (
        record.get("SẢN PHẨM")
        or record.get("PHÂN LOẠI")
        or record.get("DANH MỤC SẢN PHẨM")
        or ""
    )


def normalize_products(price_csv: Path) -> list[dict[str, object]]:
    records = table_from_csv(price_csv, header_row_index=1)
    fill_down(records, ["DANH MỤC SẢN PHẨM"])

    products = []
    for record in records:
        name = product_key(record)
        if not name:
            continue

        products.append(
            {
                "name": name,
                "category": record.get("DANH MỤC SẢN PHẨM", ""),
                "classification": record.get("PHÂN LOẠI", ""),
                "description": record.get("MÔ TẢ SẢN PHẨM", ""),
                "audience": record.get("SẢN PHẨM DÀNH CHO AI", ""),
                "usage_notes": record.get("LƯU Ý KHI DÙNG SẢN PHẨM", ""),
                "storage": record.get("BẢO QUẢN", ""),
                "pricing": {
                    "retail": record.get("GIÁ BÁN LẺ", ""),
                    "group_5": record.get("GIÁ MUA GOM 5 NGƯỜI", ""),
                    "group_10": record.get("GIÁ MUA GOM 10 NGƯỜI", ""),
                    "group_15_plus": record.get("GIÁ MUA GOM > 15 NGƯỜI", ""),
                    "membership": record.get("GIÁ MUA TRONG THẺ MEMBERSHIP", ""),
                    "package_7_days": record.get("GIÁ GÓI 7 NGÀY", ""),
                    "package_14_days": record.get("GIÁ GÓI 14 NGÀY", ""),
                    "package_21_days": record.get("GIÁ GÓI 21 NGÀY", ""),
                    "monthly_package": record.get("GIÁ GÓI THÁNG", ""),
                },
                "gift_policy": record.get("QUÀ TẶNG KÈM (NẾU CÓ)", ""),
                "bottle_return_policy": record.get("CHÍNH SÁCH THU CHAI (NẾU CÓ)", ""),
                "shipping_packaging": record.get("ĐÓNG GÓI VẬN CHUYỂN", ""),
                "commission": {
                    "sale": record.get("HOA HỒNG SALE / SẢN PHẨM", ""),
                    "leader": record.get("HOA HỒNG LEADER / SẢN PHẨM", ""),
                },
                "source_row": record,
            }
        )
    return products


def normalize_recipes(recipe_csv: Path) -> list[dict[str, object]]:
    records = table_from_csv(recipe_csv, header_row_index=1)
    fill_down(records, ["DANH MỤC SẢN PHẨM"])

    recipes: dict[str, dict[str, object]] = {}
    current_name = ""
    current_context = {
        "category": "",
        "classification": "",
        "volume": "",
        "volume_unit": "",
        "container_material": "",
        "packaging": "",
    }

    for record in records:
        category = record.get("DANH MỤC SẢN PHẨM", "")
        classification = record.get("PHÂN LOẠI", "")
        source_product_name = record.get("SẢN PHẨM", "")
        lower_product_name = source_product_name.lower()
        is_detox_combo = "Detox NGŨ" in category
        is_component_row = lower_product_name.startswith("chai") or lower_product_name.startswith(
            "lộ trình"
        )

        if is_detox_combo and classification:
            row_name = classification
        elif is_detox_combo and is_component_row:
            row_name = ""
        else:
            row_name = source_product_name or classification or ""

        if row_name:
            current_name = row_name
            current_context = {
                "category": category,
                "classification": classification,
                "volume": record.get("Dung tích", ""),
                "volume_unit": record.get("ĐVT (chai lọ)", ""),
                "container_material": record.get("Chất liệu", ""),
                "packaging": record.get("Quy cách đóng gói", ""),
            }

        name = current_name
        if not name:
            continue

        recipe = recipes.setdefault(
            name,
            {
                "name": name,
                **current_context,
                "components": [],
                "ingredients": [],
            },
        )

        if is_detox_combo and source_product_name:
            recipe["components"].append(
                {
                    "name": source_product_name,
                    "volume": record.get("Dung tích", ""),
                    "volume_unit": record.get("ĐVT (chai lọ)", ""),
                    "container_material": record.get("Chất liệu", ""),
                    "notes": record.get("Ghi chú", ""),
                }
            )

        ingredient = record.get("Thành phần", "")
        if ingredient and ingredient.lower() != "x":
            recipe["ingredients"].append(
                {
                    "name": ingredient,
                    "quantity": record.get("Định lượng", ""),
                    "quantity_unit": record.get("ĐVT (định lượng)", ""),
                    "notes": record.get("Ghi chú", ""),
                }
            )
    return list(recipes.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--price-csv", required=True, type=Path)
    parser.add_argument("--recipe-csv", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    products = normalize_products(args.price_csv)
    recipes = normalize_recipes(args.recipe_csv)
    recipes_by_name = {recipe["name"]: recipe for recipe in recipes}

    for product in products:
        recipe = recipes_by_name.get(product["name"])
        if recipe:
            product["recipe"] = recipe

    payload = {
        "metadata": {
            "snapshot_date": "2026-06-22",
            "status": "source_normalized_from_google_sheet",
            "source_price_csv": args.price_csv.as_posix(),
            "source_recipe_csv": args.recipe_csv.as_posix(),
            "compliance_note": "Use as source facts only. Public copy still needs BYT compliance review.",
        },
        "products": products,
        "recipes": recipes,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
