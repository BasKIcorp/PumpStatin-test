from sqlalchemy import Float, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
