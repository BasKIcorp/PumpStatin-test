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


def get_default_site(profile_id: str) -> dict[str, Any]:
    """Дефолтная структура site.yaml для профиля без своего конфига."""
    return SiteConfig(
        routing=SiteRoutingConfig(landingPageId="home"),
        pages=[
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
