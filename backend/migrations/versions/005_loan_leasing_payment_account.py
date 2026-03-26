"""Add payment_account_id to loans and leasing_contracts

Revision ID: 005
Revises: 004
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"


def upgrade():
    op.add_column(
        "loans",
        sa.Column(
            "payment_account_id",
            sa.Integer(),
            sa.ForeignKey("payment_accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "leasing_contracts",
        sa.Column(
            "payment_account_id",
            sa.Integer(),
            sa.ForeignKey("payment_accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("leasing_contracts", "payment_account_id")
    op.drop_column("loans", "payment_account_id")
