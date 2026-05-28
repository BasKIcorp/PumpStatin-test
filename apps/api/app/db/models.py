from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class PumpModel(Base):
    __tablename__ = "pumps"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    product_line: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(128))
    nominal_flow: Mapped[float] = mapped_column(Float)
    nominal_head: Mapped[float] = mapped_column(Float)
    power_kw: Mapped[float | None] = mapped_column(Float, nullable=True)


class CatalogItemModel(Base):
    __tablename__ = "catalog_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_key: Mapped[str] = mapped_column(String(64), index=True)
    value: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(128))


class SelectionProjectModel(Base):
    __tablename__ = "selection_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_username: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    selections: Mapped[list["SelectionHistoryModel"]] = relationship(
        back_populates="project"
    )


class SelectionHistoryModel(Base):
    __tablename__ = "selection_history"

    selection_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_username: Mapped[str] = mapped_column(String(64), index=True)
    profile_id: Mapped[str] = mapped_column(String(64), index=True)
    product_line: Mapped[str] = mapped_column(String(64), index=True)
    flow_id: Mapped[str] = mapped_column(String(64), index=True)
    selected_pump_id: Mapped[str] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(Text)
    parameters: Mapped[dict] = mapped_column(JSON)
    station_payload: Mapped[dict] = mapped_column(JSON)
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("selection_projects.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    project: Mapped[SelectionProjectModel | None] = relationship(
        back_populates="selections"
    )
