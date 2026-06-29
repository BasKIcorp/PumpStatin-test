"""Сборка PDF-инструкции по Studio-редактору со скриншотами."""

from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer

REPO_ROOT = Path(__file__).resolve().parents[4]
SCREENSHOTS = REPO_ROOT / "docs" / "studio-manual" / "screenshots"
OUTPUT = REPO_ROOT / "docs" / "studio-manual" / "Studio-Editor-Manual.pdf"

_FONT = "ManualSans"
_FONT_REGISTERED = False

_FONT_CANDIDATES = [
    Path(__file__).resolve().parents[1] / "pdf" / "fonts" / "DejaVuSans.ttf",
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("C:/Windows/Fonts/Arial.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
]


def _ensure_font() -> str:
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return _FONT
    for path in _FONT_CANDIDATES:
        if path.is_file():
            pdfmetrics.registerFont(TTFont(_FONT, str(path)))
            _FONT_REGISTERED = True
            return _FONT
    _FONT_REGISTERED = True
    return "Helvetica"


def _styles():
    font = _ensure_font()
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName=font,
            fontSize=22,
            leading=28,
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=colors.HexColor("#1e4a8c"),
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName=font,
            fontSize=16,
            leading=20,
            spaceBefore=10,
            spaceAfter=8,
            textColor=colors.HexColor("#0d99ff"),
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName=font,
            fontSize=12,
            leading=16,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName=font,
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["BodyText"],
            fontName=font,
            fontSize=10,
            leading=14,
            leftIndent=12,
            bulletIndent=0,
            spaceAfter=3,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["BodyText"],
            fontName=font,
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.grey,
            spaceAfter=10,
        ),
    }


def _img(name: str, width_mm: float = 170) -> Image | Paragraph:
    path = SCREENSHOTS / f"{name}.png"
    if not path.is_file():
        return Paragraph(f"<i>Скриншот {name}.png не найден</i>", _styles()["caption"])
    img = Image(str(path))
    max_w = width_mm * mm
    max_h = 95 * mm
    ratio = min(max_w / img.drawWidth, max_h / img.drawHeight, 1.0)
    img.drawWidth *= ratio
    img.drawHeight *= ratio
    return img


def _section(story: list, styles: dict, title: str, paragraphs: list[str], shot: str | None = None):
    story.append(Paragraph(title, styles["h1"]))
    for p in paragraphs:
        story.append(Paragraph(p, styles["body"]))
    if shot:
        story.append(Spacer(1, 4 * mm))
        story.append(_img(shot))
        story.append(Paragraph(f"Рис. — {title}", styles["caption"]))
    story.append(Spacer(1, 4 * mm))


def build_pdf() -> Path:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Инструкция — Studio редактор фронта",
        author="PumpStation",
    )
    story: list = []

    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph("PumpStation Studio", styles["title"]))
    story.append(Paragraph("Инструкция по визуальному редактору фронта", styles["title"]))
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "Документ описывает работу с редактором страниц, визарда подбора насосов "
            "и шаблонов PDF в админ-панели профиля.",
            styles["body"],
        )
    )
    story.append(PageBreak())

    _section(
        story,
        styles,
        "1. Вход в админ-панель",
        [
            "Откройте сайт и перейдите на страницу входа. Используйте учётную запись "
            "<b>admin</b> / <b>demo123</b> или кнопку быстрого входа в админку на демо-стенде.",
            "После входа откройте раздел профилей и выберите нужный профиль (например, <b>default</b> — Стрела).",
        ],
        "01-admin-profiles",
    )

    _section(
        story,
        styles,
        "2. Вкладки конструктора",
        [
            "Вверху доступны режимы: <b>Фронт</b> (настройки сайта), <b>Страницы</b> (визуальный редактор), "
            "<b>PDF</b> (шаблон документа), а также кнопки <b>Превью</b> и <b>Сохранить</b>.",
            "Перед публикацией изменений всегда нажимайте <b>Сохранить</b>. Превью показывает черновик без записи на сервер.",
        ],
        "02-studio-tabs",
    )

    _section(
        story,
        styles,
        "3. Редактор CMS-страниц",
        [
            "В выпадающем списке страниц выберите нужную (Главная, О компании, Каталог и т.д.).",
            "В центре — canvas с сеткой: блоки можно перетаскивать, менять размер за правый нижний угол.",
            "Слева вкладки <b>Слои</b> (порядок блоков) и <b>Блоки</b> (палитра для добавления).",
            "Справа — свойства выбранного блока или страницы, если ничего не выделено.",
        ],
        "03-cms-home-canvas",
    )

    _section(
        story,
        styles,
        "4. Палитра блоков",
        [
            "На вкладке <b>Блоки</b> кликните по типу блока — он добавится на canvas.",
            "Также блок можно перетащить из палитры на canvas (drag-and-drop).",
            "Для удаления выделите блок и нажмите <b>Delete</b> или кнопку удаления в панели слоёв.",
        ],
        "04-block-palette",
    )

    story.append(PageBreak())

    _section(
        story,
        styles,
        "5. Редактор визарда (Подбор насосов)",
        [
            "Выберите страницу <b>Подбор насосов</b> (/wizard). Слева — дерево шагов визарда и список слоёв текущего шага.",
            "Каждый шаг — набор grid-блоков: сайдбар, заголовок, карточки, форма подбора и панели с графиками.",
            "Переключайте шаги в панели навигации; canvas показывает блоки только выбранного шага.",
        ],
        "05-wizard-canvas",
    )

    _section(
        story,
        styles,
        "6. Свойства сайдбара и шапки",
        [
            "Настройки сайдбара Strela и шапки формы подбора доступны <b>только при клике</b> "
            "на соответствующий блок в canvas или в списке <b>Слои</b>.",
            "Сайдбар: текст под логотипом, wordmark (URL или загрузка файла), ширина CSS.",
            "Шапка формы: заголовок и логотип. Карточки подбора редактируются через свойства блока «Карточка подбора».",
        ],
        "06-wizard-sidebar-props",
    )

    if (SCREENSHOTS / "07-wizard-header-props.png").is_file() or (SCREENSHOTS / "07-wizard-card-props.png").is_file():
        shot = "07-wizard-header-props" if (SCREENSHOTS / "07-wizard-header-props.png").is_file() else "07-wizard-card-props"
        _section(
            story,
            styles,
            "7. Свойства карточек и шапки",
            [
                "В правой панели отображаются поля контента, сетки (x, y, w, h) и секция «Трансформация».",
                "Для карточек доступна загрузка изображения через drag-and-drop.",
            ],
            shot,
        )

    _section(
        story,
        styles,
        "8. Трансформация блоков",
        [
            "В свойствах блока: поворот (0°, ±90°, 180° или произвольный угол), обрезка inset в процентах.",
            "На canvas: перетаскивайте голубые полоски по сторонам блока для обрезки; правый нижний угол — изменение размера; "
            "кнопка ↻ над блоком — поворот.",
            "Для сайдбара есть пресет «боковая панель (−90°)».",
        ],
        None,
    )

    story.append(PageBreak())

    _section(
        story,
        styles,
        "9. Редактор PDF",
        [
            "Вкладка <b>PDF</b> открывает конструктор шаблона документа подбора.",
            "Страницы шаблона переключаются вкладками вверху; кнопки <b>+ Страница</b> и <b>− Страница</b> добавляют или удаляют страницу.",
            "Блоки (текст, таблица, график curves-chart) размещаются на canvas аналогично CMS-редактору.",
            "Для блока графика настройте <b>chartPreset</b> и источник данных в свойствах.",
        ],
        "08-pdf-editor",
    )

    _section(
        story,
        styles,
        "10. Превью и сохранение",
        [
            "Кнопка <b>Превью</b> открывает черновик сайта или PDF в отдельном режиме просмотра.",
            "<b>Сохранить</b> записывает site.yaml, wizard/navigation, branding и PDF-шаблон на сервер.",
            "При ошибке сохранения проверьте сообщение в верхней панели и повторите после исправления.",
        ],
        "09-preview-button",
    )

    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "Краткая шпаргалка: колёсико — панорама; Ctrl+колёсико — зум; Space+drag — рука; "
            "Escape — снять выделение; Ctrl+Z / Ctrl+Y — отмена и повтор в редакторе.",
            styles["body"],
        )
    )

    doc.build(story)
    return OUTPUT


if __name__ == "__main__":
    try:
        out = build_pdf()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print(f"OK: {out}")
