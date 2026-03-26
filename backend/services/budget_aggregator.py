from extensions import db
from models.category import Category
from models.budget_item import BudgetItem
from models.transaction import Transaction
from models.loan import Loan
from models.savings_account import SavingsAccount
from models.leasing import LeasingContract
from sqlalchemy import func, extract
from datetime import date


def get_summary(year, month):
    """Get financial summary for a given month."""
    if not year:
        year = date.today().year
    if not month:
        month = date.today().month

    categories = Category.query.all()
    cat_map = {c.id: c for c in categories}

    # Budget items for this month
    budget_items = BudgetItem.query.filter(
        BudgetItem.year == year,
        ((BudgetItem.month == month) | (BudgetItem.month.is_(None)))
    ).all()

    # Actual transactions for this month
    actuals = db.session.query(
        Transaction.category_id,
        func.sum(Transaction.amount).label("total")
    ).filter(
        extract("year", Transaction.date) == year,
        extract("month", Transaction.date) == month,
    ).group_by(Transaction.category_id).all()
    actual_map = {a.category_id: float(a.total) for a in actuals}

    # Aggregate by category type
    income_budget = 0
    income_actual = 0
    expense_budget = 0
    expense_actual = 0

    category_details = []
    for bi in budget_items:
        cat = cat_map.get(bi.category_id)
        if not cat:
            continue
        amount = float(bi.amount)
        if bi.month is None:
            amount = amount / 12  # Yearly → monthly

        actual = actual_map.get(bi.category_id, 0)

        if cat.category_type == "income":
            income_budget += amount
            income_actual += actual
        elif cat.category_type == "expense":
            expense_budget += amount
            expense_actual += actual

        category_details.append({
            "category_id": cat.id,
            "category_name": cat.name,
            "category_type": cat.category_type,
            "parent_id": cat.parent_id,
            "budget": round(amount, 2),
            "actual": round(actual, 2),
            "diff": round(amount - actual, 2),
        })

    # Loans summary
    loans = Loan.query.all()
    total_debt = sum(float(l.current_balance) for l in loans)
    total_interest = sum(l.monthly_interest_cost() for l in loans)
    total_amortization = sum(float(l.monthly_amortization) for l in loans)

    # Savings summary
    savings = SavingsAccount.query.all()
    total_savings = sum(float(s.current_balance) for s in savings)

    # Leasing summary
    leasing = LeasingContract.query.all()
    expiring_soon = [c.to_dict() for c in leasing if c.months_remaining() <= 6 and c.months_remaining() > 0]

    remaining = income_budget - expense_budget - total_interest - total_amortization

    return {
        "year": year,
        "month": month,
        "income_budget": round(income_budget, 2),
        "income_actual": round(income_actual, 2),
        "expense_budget": round(expense_budget, 2),
        "expense_actual": round(expense_actual, 2),
        "loan_interest": round(total_interest, 2),
        "loan_amortization": round(total_amortization, 2),
        "total_debt": round(total_debt, 2),
        "total_savings": round(total_savings, 2),
        "remaining_budget": round(remaining, 2),
        "remaining_actual": round(income_actual - expense_actual - total_interest - total_amortization, 2),
        "categories": category_details,
        "expiring_leasing": expiring_soon,
        "savings_accounts": [s.to_dict() for s in savings],
        "loans": [l.to_dict() for l in loans],
    }


def get_trends(year):
    """Get monthly trends for an entire year."""
    if not year:
        year = date.today().year

    months = []
    for month in range(1, 13):
        # Budget totals
        income_budget = db.session.query(func.sum(BudgetItem.amount)).join(
            Category
        ).filter(
            Category.category_type == "income",
            BudgetItem.year == year,
            BudgetItem.month == month,
        ).scalar()

        expense_budget = db.session.query(func.sum(BudgetItem.amount)).join(
            Category
        ).filter(
            Category.category_type == "expense",
            BudgetItem.year == year,
            BudgetItem.month == month,
        ).scalar()

        # Actual totals
        income_actual = db.session.query(func.sum(Transaction.amount)).join(
            Category
        ).filter(
            Category.category_type == "income",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month,
        ).scalar()

        expense_actual = db.session.query(func.sum(Transaction.amount)).join(
            Category
        ).filter(
            Category.category_type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month,
        ).scalar()

        months.append({
            "month": month,
            "income_budget": round(float(income_budget or 0), 2),
            "income_actual": round(float(income_actual or 0), 2),
            "expense_budget": round(float(expense_budget or 0), 2),
            "expense_actual": round(float(expense_actual or 0), 2),
        })

    return {"year": year, "months": months}


def get_distribution(year, month):
    """Get expense distribution by top-level category."""
    if not year:
        year = date.today().year
    if not month:
        month = date.today().month

    # Get top-level expense categories
    top_cats = Category.query.filter_by(category_type="expense", parent_id=None).all()

    distribution = []
    for cat in top_cats:
        # Get all child category IDs
        child_ids = [cat.id]
        children = Category.query.filter_by(parent_id=cat.id).all()
        child_ids.extend([c.id for c in children])

        # Sum actuals for this category tree
        actual = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.category_id.in_(child_ids),
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month,
        ).scalar()

        # Sum budget for this category tree
        budget = db.session.query(func.sum(BudgetItem.amount)).filter(
            BudgetItem.category_id.in_(child_ids),
            BudgetItem.year == year,
            ((BudgetItem.month == month) | (BudgetItem.month.is_(None)))
        ).scalar()

        distribution.append({
            "category_id": cat.id,
            "category_name": cat.name,
            "budget": round(float(budget or 0), 2),
            "actual": round(float(actual or 0), 2),
        })

    return {"year": year, "month": month, "distribution": distribution}
