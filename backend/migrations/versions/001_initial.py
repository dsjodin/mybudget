"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('categories.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('sort_order', sa.Integer(), default=0),
        sa.Column('category_type', sa.String(20), nullable=False),
        sa.Column('budget_mode', sa.String(10), default='monthly'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('budget_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('category_id', 'year', 'month', name='uq_budget_cat_year_month'),
    )

    op.create_table('transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('loans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('lender', sa.String(100), nullable=True),
        sa.Column('original_amount', sa.Numeric(14, 2), nullable=False),
        sa.Column('current_balance', sa.Numeric(14, 2), nullable=False),
        sa.Column('interest_rate', sa.Numeric(5, 4), nullable=False),
        sa.Column('rate_type', sa.String(10), default='variable'),
        sa.Column('rate_fixed_until', sa.Date(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('monthly_amortization', sa.Numeric(12, 2), default=0),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('loan_rate_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('loan_id', sa.Integer(), sa.ForeignKey('loans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rate', sa.Numeric(5, 4), nullable=False),
        sa.Column('effective_date', sa.Date(), nullable=False),
    )

    op.create_table('leasing_contracts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('vehicle_name', sa.String(100), nullable=False),
        sa.Column('monthly_cost', sa.Numeric(12, 2), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('term_months', sa.Integer(), nullable=False),
        sa.Column('residual_value', sa.Numeric(12, 2), nullable=True),
        sa.Column('mileage_limit', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('savings_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('current_balance', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('interest_rate', sa.Numeric(5, 4), server_default='0'),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('savings_transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('account_id', sa.Integer(), sa.ForeignKey('savings_accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('balance_after', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('scenarios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('scenario_overrides',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('scenario_id', sa.Integer(), sa.ForeignKey('scenarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('override_type', sa.String(30), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=True),
        sa.Column('params', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('scenario_overrides')
    op.drop_table('scenarios')
    op.drop_table('savings_transactions')
    op.drop_table('savings_accounts')
    op.drop_table('leasing_contracts')
    op.drop_table('loan_rate_history')
    op.drop_table('loans')
    op.drop_table('transactions')
    op.drop_table('budget_items')
    op.drop_table('categories')
