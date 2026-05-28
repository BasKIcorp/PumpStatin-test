"""Генерация PDF через ReportLab (без системных зависимостей cairo)."""

from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

_FONT_NAME = "AppSans"
_FONT_REGISTERED = False

_FONT_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("C:/Windows/Fonts/Arial.ttf"),
]


def _ensure_font() -> str:
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return _FONT_NAME
    for path in _FONT_CANDIDATES:
        if path.is_file():
            pdfmetrics.registerFont(TTFont(_FONT_NAME, str(path)))
            _FONT_REGISTERED = True
            return _FONT_NAME
    _FONT_REGISTERED = True
    return "Helvetica"


def _hex(color: str, fallback: str = "#1e4a8c") -> colors.Color:
    value = (color or fallback).lstrip("#")
    if len(value) == 6:
        r, g, b = int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)
        return colors.Color(r / 255, g / 255, b / 255)
    return colors.HexColor(fallback)


def build_themed_pdf(
    selection: dict[str, Any],
    branding: dict[str, Any],
    template_id: str,
    document_type: str = "selection",
) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    palette = branding.get("colors", {})
    primary = _hex(palette.get("primary", "#1e4a8c"))
    accent = _hex(palette.get("accent", "#c41e3a"))
    pdf_meta = branding.get("pdf", {})

    font = _ensure_font()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontName=font,
        textColor=primary,
        fontSize=16,
        spaceAfter=6,
    )
    sub_style = ParagraphStyle(
        "Sub",
        parent=styles["Normal"],
        fontName=font,
        textColor=colors.grey,
        fontSize=9,
    )
    body = ParagraphStyle("Body", parent=styles["Normal"], fontName=font, fontSize=10)

    story: list[Any] = []
    story.append(Paragraph(branding.get("appTitle", "Подбор"), title_style))
    tagline = pdf_meta.get("headerTagline", "")
    if tagline:
        story.append(Paragraph(tagline, sub_style))
    story.append(Spacer(1, 8))

    if template_id == "acme-datasheet":
        story.append(
            Paragraph(
                '<font color="#FF6F00"><b>ACME DATASHEET</b></font>',
                styles["Heading2"],
            )
        )
        story.append(Spacer(1, 6))

    config = selection.get("configuration", {})
    pump = config.get("pump", {}) if isinstance(config, dict) else {}
    commercial = selection.get("commercial", {})

    if document_type == "tkp":
        story.append(Paragraph("<b>Технико-коммерческое предложение (ТКП)</b>", body))
    elif document_type == "techsheet":
        story.append(Paragraph("<b>Технический лист подобранного насоса</b>", body))
    else:
        story.append(Paragraph("<b>Результат подбора</b>", body))
    story.append(Paragraph(f"<b>{selection.get('summary', '')}</b>", body))
    story.append(Spacer(1, 12))

    rows = [["Параметр", "Значение"]]
    if document_type == "tkp":
        rows.extend(
            [
                ["Линейка", str(config.get("productLine", "—"))],
                ["Насос", str(pump.get("name", "—"))],
                ["Количество насосов", str(config.get("pumpCount", "—"))],
                ["Базовая цена, руб", str(commercial.get("basePriceRub", "—"))],
                ["Цена за насос, руб", str(commercial.get("unitPriceRub", "—"))],
                ["Итоговая стоимость, руб", str(commercial.get("totalPriceRub", "—"))],
            ]
        )
    elif document_type == "techsheet":
        hydraulics = config.get("hydraulics", {}) if isinstance(config, dict) else {}
        rows.extend(
            [
                ["Наименование", str(pump.get("name", "—"))],
                ["ID насоса", str(pump.get("id", "—"))],
                ["Номинальная подача, м3/ч", str(pump.get("nominal_flow", "—"))],
                ["Номинальный напор, м", str(pump.get("nominal_head", "—"))],
                ["Номинальная мощность, кВт", str(pump.get("power_kw", "—"))],
                ["Расход системы, м3/ч", str(hydraulics.get("flowRate", "—"))],
                ["Напор системы, м", str(hydraulics.get("head", "—"))],
                ["Статический напор, м", str(hydraulics.get("staticHead", "—"))],
                ["Гарантированный напор, м", str(hydraulics.get("guaranteedHead", "—"))],
                ["Опции", ", ".join(f"{k}={v}" for k, v in config.get("options", {}).items()) or "—"],
            ]
        )
    else:
        for key, val in _flatten_config(config):
            rows.append([str(key), str(val)])

    table = Table(rows, colWidths=[70 * mm, 95 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), primary),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), font),
                ("FONTNAME", (0, 1), (-1, -1), font),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 16))

    footer = pdf_meta.get("footerLegal", "")
    if footer:
        story.append(Paragraph(footer, sub_style))

    if template_id == "nord-compact":
        story.insert(0, Spacer(1, 4))
        hr = Table([[""]], colWidths=[165 * mm], rowHeights=[2])
        hr.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), accent)]))
        story.insert(2, hr)

    doc.build(story)
    return buf.getvalue()


def _flatten_config(obj: Any, prefix: str = "") -> list[tuple[str, Any]]:
    items: list[tuple[str, Any]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f"{prefix}.{k}" if prefix else str(k)
            items.extend(_flatten_config(v, key))
    elif isinstance(obj, list):
        items.append((prefix, ", ".join(str(x) for x in obj)))
    else:
        items.append((prefix, obj))
    return items
