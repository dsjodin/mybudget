"""Add linked_section to categories

Revision ID: 006
Revises: 005
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"


def upgrade():
    op.add_column(
        "categories",
        sa.Column("linked_section", sa.String(20), nullable=True),
    )


def downgrade():
    op.drop_column("categories", "linked_section")
