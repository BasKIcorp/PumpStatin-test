"""v2 schema: pump curves, fluid, DN, BOM."""

from alembic import op
import sqlalchemy as sa

revision = "20250617_v2"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pump_curve_points",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pump_id", sa.String(length=32), nullable=False),
        sa.Column("curve_kind", sa.String(length=16), nullable=False),
        sa.Column("point_index", sa.Integer(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["pump_id"], ["pumps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pump_curve_points_pump_id", "pump_curve_points", ["pump_id"])
    op.create_index("ix_pump_curve_points_curve_kind", "pump_curve_points", ["curve_kind"])

    op.create_table(
        "fluid_properties",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("med", sa.String(length=64), nullable=False),
        sa.Column("c", sa.Integer(), nullable=False),
        sa.Column("t", sa.Integer(), nullable=False),
        sa.Column("den", sa.Float(), nullable=False),
        sa.Column("mu", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fluid_properties_med", "fluid_properties", ["med"])

    op.create_table(
        "pipe_dn_series",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dn_nominal", sa.Float(), nullable=False),
        sa.Column("d_outer", sa.Float(), nullable=False),
        sa.Column("wall_thickness", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "bom_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("when_json", sa.JSON(), nullable=False),
        sa.Column("items_json", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    with op.batch_alter_table("pumps") as batch:
        batch.add_column(sa.Column("mf", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("pump_type", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("series", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("q_max", sa.Float(), nullable=True))
        batch.add_column(sa.Column("h_max", sa.Float(), nullable=True))
        batch.add_column(sa.Column("frequency_rpm", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_table("bom_rules")
    op.drop_table("pipe_dn_series")
    op.drop_table("fluid_properties")
    op.drop_index("ix_pump_curve_points_curve_kind", "pump_curve_points")
    op.drop_index("ix_pump_curve_points_pump_id", "pump_curve_points")
    op.drop_table("pump_curve_points")
    with op.batch_alter_table("pumps") as batch:
        batch.drop_column("frequency_rpm")
        batch.drop_column("h_max")
        batch.drop_column("q_max")
        batch.drop_column("series")
        batch.drop_column("pump_type")
        batch.drop_column("mf")
