"""Реестр плагинов: algorithm, database, pdf — по имени из profile.yaml."""

from app.algorithms.base import AlgorithmProtocol
from app.algorithms.bps_w_stub import BpsWStubAlgorithm
from app.algorithms.bps_w_v1 import BpsWV1Algorithm
from app.db.adapters.mock import MockDatabaseAdapter
from app.db.adapters.postgres import PostgresDatabaseAdapter
from app.db.base import DatabaseAdapter
from app.pdf.base import PdfRenderer
from app.pdf.jinja_renderer import JinjaThemePdf

_ALGORITHMS: dict[str, AlgorithmProtocol] = {
    "bps_w_stub": BpsWStubAlgorithm(),
    "bps_w_v1": BpsWV1Algorithm(),
}

_DATABASES: dict[str, DatabaseAdapter] = {
    "mock": MockDatabaseAdapter(),
    "postgres": PostgresDatabaseAdapter(),
}

# PDF привязан к theme (см. THEME_PDF_PAIRS в profile_loader)
_PDF: dict[str, PdfRenderer] = {
    "strela-standard": JinjaThemePdf("strela-standard", "theme-strela"),
    "acme-datasheet": JinjaThemePdf("acme-datasheet", "theme-acme"),
    "nord-compact": JinjaThemePdf("nord-compact", "theme-nord"),
    "aqua-report": JinjaThemePdf("aqua-report", "theme-aqua"),
}


def get_algorithm(name: str) -> AlgorithmProtocol:
    if name not in _ALGORITHMS:
        raise KeyError(f"Unknown algorithm: {name}")
    return _ALGORITHMS[name]


def get_database(name: str) -> DatabaseAdapter:
    if name not in _DATABASES:
        raise KeyError(f"Unknown database adapter: {name}")
    return _DATABASES[name]


def get_pdf_renderer(name: str) -> PdfRenderer:
    if name not in _PDF:
        raise KeyError(f"Unknown PDF template: {name}")
    return _PDF[name]


def list_algorithms() -> list[str]:
    return sorted(_ALGORITHMS.keys())


def list_databases() -> list[str]:
    return sorted(_DATABASES.keys())


def list_pdf_templates() -> list[str]:
    return sorted(_PDF.keys())
