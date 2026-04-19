"""add purchase_image_url

Revision ID: 0d3b5d02e317
Revises: c2f4a1e9b7d3
Create Date: 2026-04-19 22:11:55.577652

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0d3b5d02e317'
down_revision = 'c2f4a1e9b7d3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'purchase_record',
        sa.Column('purchase_image_url', sa.String(length=500), nullable=True),
    )


def downgrade():
    op.drop_column('purchase_record', 'purchase_image_url')
