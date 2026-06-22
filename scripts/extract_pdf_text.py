from __future__ import annotations

import argparse
from pathlib import Path

try:
    from pypdf import PdfReader
except ModuleNotFoundError as exc:
    raise SystemExit("Missing dependency: run `python -m pip install pypdf` first.") from exc


def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(f"--- page {index} ---\n{text.strip()}")
    return "\n\n".join(pages).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(extract_text(args.pdf), encoding="utf-8")


if __name__ == "__main__":
    main()
