from typing import Any

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
        return build_themed_pdf(selection, branding, self.template_id, document_type)
