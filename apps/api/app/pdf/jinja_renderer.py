import json
from pathlib import Path
from typing import Any

from app.core.config import PROFILES_DIR
from app.pdf.reportlab_build import build_themed_pdf


class JinjaThemePdf:
    """PDF в стиле темы сайта (ReportLab + template_id для варианта макета)."""

    def __init__(self, template_id: str, theme_id: str, html_name: str = "template.html"):
        self.template_id = template_id
        self.theme_id = theme_id
        self._html_name = html_name  # зарезервировано для HTML-экспорта

    def render(
        self,
        selection: dict[str, Any],
        branding: dict[str, Any],
        document_type: str = "selection",
    ) -> bytes:
        profile_id = selection.get("_profileId", "default")
        tpl_path = PROFILES_DIR / profile_id / "pdf" / "template.json"
        if tpl_path.is_file() and document_type == "selection":
            from app.pdf.block_renderer import render_pdf_from_blocks

            with tpl_path.open(encoding="utf-8") as f:
                template = json.load(f)
            return render_pdf_from_blocks(template, selection, branding)
        return build_themed_pdf(selection, branding, self.template_id, document_type)
