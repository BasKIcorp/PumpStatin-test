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
    blocks = list(template_json.get("blocks", []))
    mode = template_json.get("mode", "auto")
    if mode == "free":
        blocks.sort(key=lambda b: (b.get("y", 0), b.get("x", 0)))
    ctx = _build_pdf_context(selection, branding)

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
        resolved = _resolve(props, ctx)

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
            pumps = _get_pumps(ctx)
            if not pumps:
                pump = ctx.get("pump")
                if isinstance(pump, dict) and pump:
                    pumps = [pump]
            for p in pumps:
                rows.append([
                    p.get("name", p.get("model", "")),
                    str(p.get("nominal_flow", p.get("flow", ""))),
                    str(p.get("nominal_head", p.get("head", ""))),
                    str(p.get("power_kw", p.get("powerKw", p.get("power", "")))),
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

        elif btype == "dn-info":
            station = ctx.get("station", {})
            dn = station.get("DN", "—")
            vel = station.get("velocity", "")
            text = f"Диаметр трубопровода DN {dn} мм"
            if vel:
                text += f", скорость {vel} м/с"
            flowables.append(Paragraph(f"<b>{text}</b>", base_style))
            flowables.append(Spacer(1, 6))

        elif btype == "bom-table":
            flowables.append(Paragraph("<b>Спецификация (BOM)</b>", heading_style))
            rows = [["Позиция", "Кол-во"]]
            bom_items = _get_bom_items(ctx)
            for item in bom_items:
                label = item.get("label") or item.get("id") or "—"
                rows.append([str(label), str(item.get("qty", 1))])
            if len(bom_items) == 0:
                rows.append(["—", "—"])
            table = Table(rows, colWidths=[280, 80])
            table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            flowables.append(table)
            flowables.append(Spacer(1, 6))

        elif btype == "curves-chart":
            wp = ctx.get("working_point", {})
            flowables.append(Paragraph(
                f"<b>Рабочая точка:</b> Q = {wp.get('Q', '—')} м³/ч, H = {wp.get('H', '—')} м",
                base_style,
            ))
            flowables.append(Spacer(1, 6))

        elif btype == "spec-sheet":
            specs = _get_specs(ctx)
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


def _build_pdf_context(
    selection: dict[str, Any] | None,
    branding: dict[str, Any] | None,
) -> dict[str, Any]:
    """Нормализует payload v2 для bindings {{station.DN}}, {{bom.items}} и т.д."""
    sel = selection or {}
    config = sel.get("configuration", {})
    dn_block = sel.get("DN") if isinstance(sel.get("DN"), dict) else {}
    bom = sel.get("bom") or config.get("bom") or []
    pump = config.get("selectedPump") or {}
    wp = config.get("workingPoint") or sel.get("workingPoint") or {}

    station = {
        "DN": config.get("DN") or dn_block.get("DN"),
        "velocity": config.get("velocity") or dn_block.get("velocity"),
        "dn_suction": dn_block.get("dn_suction"),
        "dn_discharge": dn_block.get("dn_discharge"),
    }

    brand = branding or {}
    copy_block = brand.get("copy") if isinstance(brand.get("copy"), dict) else {}

    return {
        **sel,
        "configuration": config,
        "station": station,
        "bom": {"items": bom},
        "pump": pump,
        "working_point": wp,
        "branding": {
            **brand,
            "appTitle": brand.get("appTitle", ""),
            "copy": copy_block,
        },
    }


def _resolve(props: dict, ctx: dict | None) -> dict:
    """Подставляет {{...}} шаблоны из данных selection."""
    import re
    result = {}
    for key, val in props.items():
        if isinstance(val, str):
            result[key] = _resolve_template(val, ctx)
        else:
            result[key] = val
    return result


def _resolve_template(template: str, ctx: dict | None) -> str:
    """Заменяет {{path.to.field}} на значение из нормализованного контекста."""
    import re

    def replacer(m):
        path = m.group(1).strip()
        parts = path.split(".")
        obj: Any = ctx or {}
        for p in parts:
            if isinstance(obj, dict):
                obj = obj.get(p, "")
            elif isinstance(obj, list) and p.isdigit():
                idx = int(p)
                obj = obj[idx] if 0 <= idx < len(obj) else ""
            else:
                return m.group(0)
        if isinstance(obj, (list, dict)):
            return str(len(obj)) if isinstance(obj, list) else ""
        return str(obj) if obj is not None else m.group(0)

    return re.sub(r"\{\{(.+?)\}\}", replacer, template)


def _get_pumps(ctx: dict | None) -> list[dict]:
    if not ctx:
        return []
    result = ctx.get("result", {})
    pumps = result.get("pumps", result.get("candidates", []))
    if pumps:
        return pumps
    pump = ctx.get("pump")
    return [pump] if isinstance(pump, dict) and pump else []


def _get_bom_items(ctx: dict | None) -> list[dict]:
    if not ctx:
        return []
    bom = ctx.get("bom")
    if isinstance(bom, dict):
        items = bom.get("items")
        return items if isinstance(items, list) else []
    if isinstance(bom, list):
        return bom
    config = ctx.get("configuration", {})
    items = config.get("bom")
    return items if isinstance(items, list) else []


def _get_specs(ctx: dict | None) -> list[dict]:
    if not ctx:
        return []
    result = ctx.get("result", {})
    spec_map = result.get("specs", result.get("configuration", {}))
    if isinstance(spec_map, dict):
        return [{"label": k, "value": str(v)} for k, v in spec_map.items()]
    return []
