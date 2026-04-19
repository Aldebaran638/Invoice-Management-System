"""add expense category and extend purchase record

Revision ID: c2f4a1e9b7d3
Revises: 301f7147f297
Create Date: 2026-04-19 23:59:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c2f4a1e9b7d3"
down_revision = "301f7147f297"
branch_labels = None
depends_on = None


expense_category_table = sa.table(
    "expense_category",
    sa.column("id", sa.BigInteger()),
    sa.column("name", sa.String(length=255)),
    sa.column("description", sa.Text()),
)

expense_subcategory_table = sa.table(
    "expense_subcategory",
    sa.column("id", sa.BigInteger()),
    sa.column("name", sa.String(length=255)),
    sa.column("major_category_id", sa.BigInteger()),
    sa.column("description", sa.Text()),
)


def upgrade() -> None:
    op.create_table(
        "expense_category",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("name", name="uq_expense_category_name"),
    )

    op.create_table(
        "expense_subcategory",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("major_category_id", sa.BigInteger(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["major_category_id"], ["expense_category.id"]),
        sa.UniqueConstraint("name", name="uq_expense_subcategory_name"),
    )

    op.bulk_insert(
        expense_category_table,
        [
            {"id": 1, "name": "交通费用", "description": None},
            {"id": 2, "name": "膳食/应酬费用", "description": None},
            {"id": 3, "name": "汽车费用", "description": None},
            {"id": 4, "name": "其他项目费用", "description": None},
        ],
    )

    op.bulk_insert(
        expense_subcategory_table,
        [
            {"id": 1, "name": "自动导航承载车", "major_category_id": 4, "description": None},
            {"id": 2, "name": "智能喷漆机器人", "major_category_id": 4, "description": None},
            {"id": 3, "name": "钢筋折弯与结扎机器人", "major_category_id": 4, "description": None},
            {"id": 4, "name": "生产线车队调度", "major_category_id": 4, "description": None},
            {"id": 5, "name": "研发部开销", "major_category_id": 4, "description": None},
        ],
    )

    op.execute("SELECT setval('expense_category_id_seq', (SELECT MAX(id) FROM expense_category))")
    op.execute("SELECT setval('expense_subcategory_id_seq', (SELECT MAX(id) FROM expense_subcategory))")

    op.add_column("purchase_record", sa.Column("founder_name", sa.String(length=255), nullable=True))
    op.add_column("purchase_record", sa.Column("major_category_id", sa.BigInteger(), nullable=True))
    op.add_column("purchase_record", sa.Column("sub_category_id", sa.BigInteger(), nullable=True))
    op.add_column("purchase_record", sa.Column("remarks", sa.Text(), nullable=True))

    op.execute("UPDATE purchase_record SET founder_name = '未知' WHERE founder_name IS NULL")
    op.execute("UPDATE purchase_record SET major_category_id = 4 WHERE major_category_id IS NULL")

    op.alter_column("purchase_record", "founder_name", nullable=False)
    op.alter_column("purchase_record", "major_category_id", nullable=False)

    op.create_foreign_key(
        "fk_purchase_record_major_category",
        "purchase_record",
        "expense_category",
        ["major_category_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_purchase_record_sub_category",
        "purchase_record",
        "expense_subcategory",
        ["sub_category_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_purchase_record_sub_category", "purchase_record", type_="foreignkey")
    op.drop_constraint("fk_purchase_record_major_category", "purchase_record", type_="foreignkey")

    op.drop_column("purchase_record", "remarks")
    op.drop_column("purchase_record", "sub_category_id")
    op.drop_column("purchase_record", "major_category_id")
    op.drop_column("purchase_record", "founder_name")

    op.drop_table("expense_subcategory")
    op.drop_table("expense_category")
