"""Pydantic-модели для site.yaml."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class LogoConfig(BaseModel):
    src: str = "/logo.svg"
    width: int = 180
    link: str = "/"


class MenuItem(BaseModel):
    label: str
    pageId: str


class FooterLink(BaseModel):
    label: str
    pageId: str


class FooterColumn(BaseModel):
    title: str
    links: list[FooterLink] = []


class FooterConfig(BaseModel):
    columns: list[FooterColumn] = []
    copyright: str = ""


class HeaderConfig(BaseModel):
    logo: LogoConfig = LogoConfig()
    menu: list[MenuItem] = []
    loginButton: bool = True


class LayoutConfig(BaseModel):
    header: HeaderConfig = HeaderConfig()
    footer: FooterConfig = FooterConfig()


class BlockGridLayout(BaseModel):
    x: int = 0
    y: int = 0
    w: int = 12
    h: int = 4


class BlockConfig(BaseModel):
    id: str
    type: str
    props: dict[str, Any] = Field(default_factory=dict)
    layout: BlockGridLayout | None = None
    bindings: dict[str, Any] | None = None


class PageGridConfig(BaseModel):
    cols: int = 12
    rowHeight: int = 40


class WizardFrameConfig(BaseModel):
    blocks: list[BlockConfig] = Field(default_factory=list)


class PageConfig(BaseModel):
    id: str
    title: str
    route: str
    inMenu: bool = True
    type: Literal["page", "wizard", "auth", "cabinet"] = "page"
    pageProfile: str | None = None
    grid: PageGridConfig | None = None
    blocks: list[BlockConfig] | None = None
    frames: dict[str, WizardFrameConfig] | None = None
    wizardRef: str | None = None


class SiteRoutingConfig(BaseModel):
    landingPageId: str | None = "home"


class SiteConfig(BaseModel):
    layout: LayoutConfig = LayoutConfig()
    pages: list[PageConfig] = []
    routing: SiteRoutingConfig | None = None


def default_login_page() -> PageConfig:
    """Minimal auth page when profile has no site.yaml."""
    return PageConfig(
        id="login",
        title="Вход",
        route="/login",
        inMenu=False,
        type="auth",
        pageProfile="auth-minimal",
        grid=PageGridConfig(cols=12, rowHeight=40),
        blocks=[
            BlockConfig(
                id="login-brand",
                type="auth/brand-panel",
                layout=BlockGridLayout(x=0, y=0, w=8, h=16),
            ),
            BlockConfig(
                id="login-form",
                type="auth/login-form",
                layout=BlockGridLayout(x=8, y=0, w=4, h=8),
                props={"title": "Вход"},
            ),
            BlockConfig(
                id="login-quick",
                type="auth/quick-login",
                layout=BlockGridLayout(x=8, y=8, w=4, h=6),
            ),
            BlockConfig(
                id="login-admin",
                type="auth/admin-entry",
                layout=BlockGridLayout(x=8, y=14, w=4, h=2),
            ),
            BlockConfig(
                id="login-back",
                type="auth/back-link",
                layout=BlockGridLayout(x=8, y=16, w=4, h=1),
            ),
        ],
    )


def get_default_site(profile_id: str) -> dict[str, Any]:
    """Дефолтная структура site.yaml для профиля без своего конфига."""
    _ = profile_id
    return SiteConfig(
        routing=SiteRoutingConfig(landingPageId="home"),
        pages=[
            default_login_page(),
            PageConfig(
                id="home",
                title="Главная",
                route="/home",
                inMenu=True,
                type="page",
            ),
            PageConfig(
                id="wizard",
                title="Подбор",
                route="/wizard",
                inMenu=True,
                type="wizard",
                wizardRef="navigation.yaml",
            ),
        ],
    ).model_dump()
