"""Pydantic-модели для site.yaml."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


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


class BlockConfig(BaseModel):
    id: str
    type: str
    props: dict[str, Any] = {}


class PageConfig(BaseModel):
    id: str
    title: str
    route: str
    inMenu: bool = True
    type: Literal["page", "wizard"] = "page"
    blocks: list[BlockConfig] | None = None
    wizardRef: str | None = None


class SiteConfig(BaseModel):
    layout: LayoutConfig = LayoutConfig()
    pages: list[PageConfig] = []


def get_default_site(profile_id: str) -> dict[str, Any]:
    """Дефолтная структура site.yaml для профиля без своего конфига."""
    return SiteConfig(
        pages=[
            PageConfig(
                id="wizard",
                title="Подбор",
                route="/",
                inMenu=True,
                type="wizard",
                wizardRef="navigation.yaml",
            ),
        ],
    ).model_dump()
