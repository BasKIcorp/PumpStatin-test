#!/usr/bin/env python3
"""Импорт текстов и картинок карточек воронки из PPTX (слайды 1–4).

Использование:
  python scripts/import-strela-cards-from-pptx.py "C:\\path\\to\\Сайт подбора.pptx"

Результат:
  - apps/web/public/selection-assets/podbor-001.png … podbor-004.png
  - обновляет config/profiles/default/wizard/navigation.yaml (product-class)
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "apps" / "web" / "public" / "selection-assets"
NAV_YAML = ROOT / "config" / "profiles" / "default" / "wizard" / "navigation.yaml"

CARD_IDS = ("hydromodules", "pump-stations", "aupd", "simpel")
NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def slide_texts(slide_xml: Path) -> list[str]:
    root = ET.parse(slide_xml).getroot()
    chunks: list[str] = []
    for node in root.iter("{http://schemas.openxmlformats.org/drawingml/2006/main}t"):
        if node.text and node.text.strip():
            chunks.append(node.text.strip())
    return chunks


def slide_image_paths(pptx_dir: Path, slide_index: int) -> list[Path]:
    rels = pptx_dir / "ppt" / "slides" / "_rels" / f"slide{slide_index}.xml.rels"
    if not rels.exists():
        return []
    root = ET.parse(rels).getroot()
    out: list[Path] = []
    for rel in root:
        target = rel.get("Target", "")
        if "media/" in target:
            path = pptx_dir / "ppt" / target.replace("../", "")
            if path.is_file():
                out.append(path)
    return out


def main() -> None:
    if len(sys.argv) < 2:
        print("Укажите путь к .pptx", file=sys.stderr)
        sys.exit(1)

    pptx_path = Path(sys.argv[1])
    if not pptx_path.is_file() or pptx_path.stat().st_size == 0:
        print(f"Файл не найден или пустой: {pptx_path}", file=sys.stderr)
        sys.exit(1)

    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(pptx_path) as zf:
            zf.extractall(tmp_path)

        slides_dir = tmp_path / "ppt" / "slides"
        extracted: list[tuple[list[str], Path | None]] = []
        for i in range(1, 5):
            slide_xml = slides_dir / f"slide{i}.xml"
            texts = slide_texts(slide_xml) if slide_xml.exists() else []
            images = slide_image_paths(tmp_path, i)
            img = max(images, key=lambda p: p.stat().st_size) if images else None
            extracted.append((texts, img))

    ASSETS.mkdir(parents=True, exist_ok=True)
    for idx, (_, img) in enumerate(extracted, start=1):
        dest = ASSETS / f"podbor-{idx:03d}.png"
        if img:
            dest.write_bytes(img.read_bytes())
            print(f"OK image slide {idx} -> {dest.name} ({dest.stat().st_size} bytes)")
        else:
            print(f"WARN no image on slide {idx}")

    # Печать текстов для ручной правки YAML
    for idx, (texts, _) in enumerate(extracted, start=1):
        card_id = CARD_IDS[idx - 1]
        print(f"\n--- {card_id} (slide {idx}) ---")
        for line in texts:
            print(line)

    print("\nГотово. Проверьте navigation.yaml и при необходимости обновите description вручную.")


if __name__ == "__main__":
    main()
