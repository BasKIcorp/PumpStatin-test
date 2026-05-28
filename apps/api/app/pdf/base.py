from typing import Any, Protocol


class PdfRenderer(Protocol):
    template_id: str

    def render(
        self,
        selection: dict[str, Any],
        branding: dict[str, Any],
        document_type: str = "selection",
    ) -> bytes:
        """Вернуть PDF как bytes. Реализация: WeasyPrint / reportlab."""
        ...
