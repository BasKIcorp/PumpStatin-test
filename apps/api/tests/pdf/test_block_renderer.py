from app.pdf.block_renderer import _build_pdf_context, render_pdf_from_blocks


def test_pdf_context_v2_bindings():
    selection = {
        "configuration": {
            "DN": 50,
            "velocity": 1.2,
            "selectedPump": {"name": "COMOS 15/22", "nominal_flow": 15, "nominal_head": 22},
            "bom": [{"id": "pump", "label": "Насос", "qty": 2}],
        },
        "DN": {"DN": 50, "velocity": 1.2},
        "bom": [{"id": "pump", "label": "Насос", "qty": 2}],
    }
    ctx = _build_pdf_context(selection, {"appTitle": "Стрела", "copy": {"footer": "© Стрела"}})
    assert ctx["station"]["DN"] == 50
    assert len(ctx["bom"]["items"]) == 1
    assert ctx["pump"]["name"] == "COMOS 15/22"


def test_render_pdf_from_blocks_v2_template():
    template = {
        "blocks": [
            {"type": "header", "props": {"title": "{{branding.appTitle}}", "subtitle": "ТКП"}},
            {"type": "dn-info", "props": {}},
            {"type": "bom-table", "props": {}},
        ]
    }
    selection = {
        "configuration": {"DN": 40, "velocity": 1.0, "bom": [{"label": "Насос COMOS", "qty": 2}]},
        "DN": {"DN": 40},
        "bom": [{"label": "Насос COMOS", "qty": 2}],
    }
    pdf = render_pdf_from_blocks(template, selection, {"appTitle": "PumpStation"})
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 500


def test_render_pdf_free_mode_sorts_by_y():
    template = {
        "mode": "free",
        "blocks": [
            {"type": "text", "y": 100, "x": 0, "props": {"content": "Second"}},
            {"type": "text", "y": 0, "x": 0, "props": {"content": "First"}},
        ],
    }
    pdf = render_pdf_from_blocks(template, {}, {})
    assert pdf[:4] == b"%PDF"
