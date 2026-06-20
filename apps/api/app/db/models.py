from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
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
    mf: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    pump_type: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    series: Mapped[str | None] = mapped_column(String(32), nullable=True)
    q_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    h_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    frequency_rpm: Mapped[float | None] = mapped_column(Float, nullable=True)

    curve_points: Mapped[list["PumpCurvePointModel"]] = relationship(
        back_populates="pump", cascade="all, delete-orphan"
    )


class PumpCurvePointModel(Base):
    __tablename__ = "pump_curve_points"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pump_id: Mapped[str] = mapped_column(
        ForeignKey("pumps.id", ondelete="CASCADE"), index=True
    )
    curve_kind: Mapped[str] = mapped_column(String(16), index=True)
    point_index: Mapped[int] = mapped_column(Integer)
    value: Mapped[float] = mapped_column(Float)

    pump: Mapped[PumpModel] = relationship(back_populates="curve_points")


class FluidPropertyModel(Base):
    __tablename__ = "fluid_properties"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    med: Mapped[str] = mapped_column(String(64), index=True)
    c: Mapped[int] = mapped_column(Integer, index=True)
    t: Mapped[int] = mapped_column(Integer, index=True)
    den: Mapped[float] = mapped_column(Float)
    mu: Mapped[float] = mapped_column(Float)


class PipeDnSeriesModel(Base):
    __tablename__ = "pipe_dn_series"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dn_nominal: Mapped[float] = mapped_column(Float, index=True)
    d_outer: Mapped[float] = mapped_column(Float)
    wall_thickness: Mapped[float] = mapped_column(Float)


class BomRuleModel(Base):
    __tablename__ = "bom_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64))
    when_json: Mapped[dict] = mapped_column(JSON)
    items_json: Mapped[list] = mapped_column(JSON)


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
