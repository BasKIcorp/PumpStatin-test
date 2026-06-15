"""PDF рендеринг из template.json (блочный конструктор)."""

from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

_FONT_NAME = "AppSans"
_FONT_REGISTERED = False

_FONT_CANDIDATES = [
    Path(__file__).resolve().parent / "fonts" / "DejaVuSans.ttf",
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


def render_pdf_from_blocks(
    template_json: dict[str, Any],
    selection: dict[str, Any] | None = None,
    branding: dict[str, Any] | None = None,
) -> bytes:
    """Генерирует PDF из template.json с подстановкой данных."""
    font_name = _ensure_font()
    blocks = template_json.get("blocks", [])

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    base_style = ParagraphStyle(
        "Body",
        fontName=font_name,
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        "Heading", parent=base_style, fontSize=14, leading=18, spaceAfter=8
    )
    small_style = ParagraphStyle(
        "Small", parent=base_style, fontSize=8, leading=10
    )

    flowables: list[Any] = []

    for block in blocks:
        btype = block.get("type", "text")
        props = block.get("props", {})

        # Подстановка данных
        resolved = _resolve(props, selection)

        if btype == "header":
            flowables.append(Paragraph(
                f"<b>{resolved.get('title', '')}</b>", heading_style
            ))
            if resolved.get("subtitle"):
                flowables.append(Paragraph(
                    resolved["subtitle"], base_style
                ))
            flowables.append(Spacer(1, 6))

        elif btype == "footer":
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(
                resolved.get("text", ""), small_style
            ))

        elif btype == "text":
            flowables.append(Paragraph(
                resolved.get("content", ""), base_style
            ))

        elif btype == "divider":
            flowables.append(Spacer(1, 4))

        elif btype == "customer-info":
            if resolved.get("organization"):
                flowables.append(Paragraph(
                    f"<b>{resolved['organization']}</b>", base_style
                ))
            if resolved.get("date"):
                flowables.append(Paragraph(
                    resolved["date"], small_style
                ))
            flowables.append(Spacer(1, 6))

        elif btype == "equipment-table":
            rows = [["Модель", "Q, м³/ч", "H, м", "N, кВт"]]
            pumps = _get_pumps(selection)
            for p in pumps:
                rows.append([
                    p.get("name", p.get("model", "")),
                    str(p.get("nominal_flow", p.get("flow", ""))),
                    str(p.get("nominal_head", p.get("head", ""))),
                    str(p.get("power_kw", p.get("power", ""))),
                ])
            if len(pumps) == 0:
                rows.append(["—", "—", "—", "—"])

            col_widths = [120, 80, 80, 80]
            table = Table(rows, colWidths=col_widths)
            table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(19/255, 52/255, 127/255)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            flowables.append(table)
            flowables.append(Spacer(1, 6))

        elif btype == "spec-sheet":
            specs = _get_specs(selection)
            rows = [["Параметр", "Значение"]]
            for s in specs:
                rows.append([s.get("label", ""), s.get("value", "")])
            table = Table(rows, colWidths=[200, 160])
            table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            flowables.append(table)
            flowables.append(Spacer(1, 6))

        elif btype == "signature":
            flowables.append(Spacer(1, 12))
            flowables.append(Paragraph(
                f"___________ / {resolved.get('name', '')} /", small_style
            ))

    doc.build(flowables)
    return buf.getvalue()


def _resolve(props: dict, selection: dict | None) -> dict:
    """Подставляет {{...}} шаблоны из данных selection."""
    import re
    result = {}
    for key, val in props.items():
        if isinstance(val, str):
            result[key] = _resolve_template(val, selection)
        else:
            result[key] = val
    return result


def _resolve_template(template: str, selection: dict | None) -> str:
    """Заменяет {{path.to.field}} на значение из selection."""
    import re

    def replacer(m):
        path = m.group(1).strip()
        parts = path.split(".")
        obj = selection or {}
        for p in parts:
            if isinstance(obj, dict):
                obj = obj.get(p, "")
            else:
                return m.group(0)
        return str(obj) if obj is not None else m.group(0)

    return re.sub(r"\{\{(.+?)\}\}", replacer, template)


def _get_pumps(selection: dict | None) -> list[dict]:
    if not selection:
        return []
    result = selection.get("result", {})
    return result.get("pumps", result.get("candidates", []))


def _get_specs(selection: dict | None) -> list[dict]:
    if not selection:
        return []
    result = selection.get("result", {})
    spec_map = result.get("specs", result.get("configuration", {}))
    if isinstance(spec_map, dict):
        return [{"label": k, "value": str(v)} for k, v in spec_map.items()]
    return []
