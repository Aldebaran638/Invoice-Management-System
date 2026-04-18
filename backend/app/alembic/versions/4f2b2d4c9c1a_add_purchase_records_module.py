"""add purchase records module

Revision ID: 4f2b2d4c9c1a
Revises: 8bf59a1e7457
Create Date: 2026-04-18 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = "4f2b2d4c9c1a"
down_revision = "8bf59a1e7457"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "purchase_category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_purchase_category_is_active"),
        "purchase_category",
        ["is_active"],
        unique=False,
    )

    op.create_table(
        "purchase_subcategory",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["purchase_category.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_purchase_subcategory_category_id"),
        "purchase_subcategory",
        ["category_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_purchase_subcategory_is_active"),
        "purchase_subcategory",
        ["is_active"],
        unique=False,
    )

    op.create_table(
        "purchase_record",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("remark", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("subcategory_id", sa.Uuid(), nullable=True),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["purchase_category.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subcategory_id"], ["purchase_subcategory.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_purchase_record_category_id"),
        "purchase_record",
        ["category_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_purchase_record_is_deleted"),
        "purchase_record",
        ["is_deleted"],
        unique=False,
    )
    op.create_index(
        op.f("ix_purchase_record_owner_id"),
        "purchase_record",
        ["owner_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_purchase_record_subcategory_id"),
        "purchase_record",
        ["subcategory_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f("ix_purchase_record_subcategory_id"), table_name="purchase_record")
    op.drop_index(op.f("ix_purchase_record_owner_id"), table_name="purchase_record")
    op.drop_index(op.f("ix_purchase_record_is_deleted"), table_name="purchase_record")
    op.drop_index(op.f("ix_purchase_record_category_id"), table_name="purchase_record")
    op.drop_table("purchase_record")

    op.drop_index(
        op.f("ix_purchase_subcategory_is_active"),
        table_name="purchase_subcategory",
    )
    op.drop_index(
        op.f("ix_purchase_subcategory_category_id"),
        table_name="purchase_subcategory",
    )
    op.drop_table("purchase_subcategory")

    op.drop_index(op.f("ix_purchase_category_is_active"), table_name="purchase_category")
    op.drop_table("purchase_category")
