"""Add loan_type to loans table

Revision ID: 003
Revises: 002
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('loans',
        sa.Column('loan_type', sa.String(20), server_default='mortgage', nullable=False)
    )


def downgrade():
    op.drop_column('loans', 'loan_type')
