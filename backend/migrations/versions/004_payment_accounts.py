"""Add payment accounts and link to categories

Revision ID: 004
Revises: 003
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('payment_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )

    op.add_column('categories',
        sa.Column('payment_account_id', sa.Integer(),
                  sa.ForeignKey('payment_accounts.id', ondelete='SET NULL'),
                  nullable=True)
    )


def downgrade():
    op.drop_column('categories', 'payment_account_id')
    op.drop_table('payment_accounts')
