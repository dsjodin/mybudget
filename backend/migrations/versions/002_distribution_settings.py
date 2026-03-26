"""Add distribution settings and app settings tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('distribution_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('savings_account_id', sa.Integer(),
                  sa.ForeignKey('savings_accounts.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('percentage', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )

    op.create_table('app_settings',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.String(255), nullable=False),
    )

    # Insert default pocket money settings
    op.execute(
        "INSERT INTO app_settings (key, value) VALUES "
        "('pocket_money_per_person', '3200'), "
        "('pocket_money_persons', '2')"
    )


def downgrade():
    op.drop_table('distribution_settings')
    op.drop_table('app_settings')
