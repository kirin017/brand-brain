from __future__ import annotations

import argparse
import csv
import json
import posixpath
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


@dataclass
class Cell:
    row: int
    column: int
    value: str


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text)
    return ascii_text.strip("-") or "sheet"


def column_index(cell_ref: str) -> int:
    letters = ""
    for char in cell_ref:
        if char.isalpha():
            letters += char.upper()
        else:
            break

    index = 0
    for char in letters:
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index


def row_index(cell_ref: str) -> int:
    digits = "".join(char for char in cell_ref if char.isdigit())
    return int(digits) if digits else 0


def read_xml(zf: zipfile.ZipFile, path: str) -> ET.Element:
    return ET.fromstring(zf.read(path))


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []

    root = read_xml(zf, "xl/sharedStrings.xml")
    strings: list[str] = []
    for item in root.findall("main:si", NS):
        parts = [node.text or "" for node in item.findall(".//main:t", NS)]
        strings.append("".join(parts))
    return strings


def workbook_sheets(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = read_xml(zf, "xl/workbook.xml")
    rels = read_xml(zf, "xl/_rels/workbook.xml.rels")

    rel_targets = {}
    for rel in rels.findall("pkgrel:Relationship", NS):
        rel_id = rel.attrib["Id"]
        target = rel.attrib["Target"]
        rel_targets[rel_id] = posixpath.normpath(posixpath.join("xl", target))

    sheets: list[tuple[str, str]] = []
    for sheet in workbook.findall("main:sheets/main:sheet", NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{NS['rel']}}}id"]
        sheets.append((name, rel_targets[rel_id]))
    return sheets


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")

    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//main:t", NS))

    value_node = cell.find("main:v", NS)
    formula_node = cell.find("main:f", NS)
    raw = value_node.text if value_node is not None else ""

    if cell_type == "s" and raw:
        try:
            return shared_strings[int(raw)]
        except (ValueError, IndexError):
            return raw

    if raw:
        return raw

    if formula_node is not None and formula_node.text:
        return "=" + formula_node.text

    return ""


def iter_cells(zf: zipfile.ZipFile, sheet_path: str, shared_strings: list[str]) -> Iterable[Cell]:
    root = read_xml(zf, sheet_path)
    for row in root.findall(".//main:sheetData/main:row", NS):
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "")
            if not ref:
                continue

            value = cell_value(cell, shared_strings)
            if value == "":
                continue

            yield Cell(row=row_index(ref), column=column_index(ref), value=value)


def write_sheet_csv(cells: list[Cell], output_path: Path) -> dict[str, object]:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not cells:
        output_path.write_text("", encoding="utf-8")
        return {
            "row_count": 0,
            "column_count": 0,
            "non_empty_rows": 0,
            "first_non_empty_row": [],
        }

    max_row = max(cell.row for cell in cells)
    max_column = max(cell.column for cell in cells)
    rows = [["" for _ in range(max_column)] for _ in range(max_row)]

    for cell in cells:
        rows[cell.row - 1][cell.column - 1] = cell.value

    trimmed_rows: list[list[str]] = []
    for row in rows:
        last_value = 0
        for index, value in enumerate(row, start=1):
            if value != "":
                last_value = index
        trimmed_rows.append(row[:last_value])

    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(trimmed_rows)

    first_non_empty = next((row for row in trimmed_rows if any(row)), [])
    return {
        "row_count": len(trimmed_rows),
        "column_count": max_column,
        "non_empty_rows": sum(1 for row in trimmed_rows if any(row)),
        "first_non_empty_row": first_non_empty,
    }


def extract_workbook(workbook_path: Path, output_root: Path) -> dict[str, object]:
    workbook_slug = slugify(workbook_path.stem)
    workbook_output = output_root / workbook_slug
    workbook_output.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(workbook_path) as zf:
        shared_strings = read_shared_strings(zf)
        sheets = workbook_sheets(zf)

        sheet_records = []
        used_slugs: set[str] = set()
        for index, (sheet_name, sheet_path) in enumerate(sheets, start=1):
            sheet_slug = slugify(sheet_name)
            if sheet_slug in used_slugs:
                sheet_slug = f"{sheet_slug}-{index}"
            used_slugs.add(sheet_slug)

            csv_path = workbook_output / f"{index:02d}-{sheet_slug}.csv"
            cells = list(iter_cells(zf, sheet_path, shared_strings))
            stats = write_sheet_csv(cells, csv_path)
            sheet_records.append(
                {
                    "index": index,
                    "name": sheet_name,
                    "csv_path": str(csv_path.as_posix()),
                    **stats,
                }
            )

    return {
        "workbook": str(workbook_path.as_posix()),
        "output_dir": str(workbook_output.as_posix()),
        "sheets": sheet_records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbooks", nargs="+", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--summary", required=True, type=Path)
    args = parser.parse_args()

    results = [extract_workbook(path, args.out) for path in args.workbooks]

    args.summary.parent.mkdir(parents=True, exist_ok=True)
    args.summary.write_text(
        json.dumps({"workbooks": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
