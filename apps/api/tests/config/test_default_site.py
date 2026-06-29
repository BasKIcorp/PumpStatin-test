from app.schemas.site import default_login_page, get_default_site


def test_default_site_includes_login_page():
    site = get_default_site("missing-profile")
    routes = [p["route"] for p in site["pages"]]
    assert "/login" in routes
    login = next(p for p in site["pages"] if p["id"] == "login")
    assert login["type"] == "auth"
    assert len(login.get("blocks") or []) >= 3


def test_default_login_page_has_form_and_admin_blocks():
    page = default_login_page()
    types = {b.type for b in page.blocks or []}
    assert "auth/login-form" in types
    assert "auth/admin-entry" in types
