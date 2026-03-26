from models.loan import Loan
from models.budget_item import BudgetItem
from models.category import Category
from services.interest_calc import calculate_monthly_interest
from sqlalchemy import func
from datetime import date


def calculate_scenario(scenario, year=None, month=None):
    """Calculate the financial impact of a scenario compared to the base case."""
    if not year:
        year = date.today().year
    if not month:
        month = date.today().month

    base = _get_base_monthly(year, month)
    modified = dict(base)

    for override in scenario.overrides:
        if override.override_type == "loan_rate":
            _apply_loan_rate(modified, override)
        elif override.override_type == "new_loan":
            _apply_new_loan(modified, override)
        elif override.override_type == "income_change":
            _apply_income_change(modified, override)
        elif override.override_type == "expense_change":
            _apply_expense_change(modified, override)

    return {
        "scenario_name": scenario.name,
        "year": year,
        "month": month,
        "base": base,
        "modified": modified,
        "diff": {
            "income": modified["income"] - base["income"],
            "expenses": modified["expenses"] - base["expenses"],
            "interest_cost": modified["interest_cost"] - base["interest_cost"],
            "remaining": modified["remaining"] - base["remaining"],
        },
    }


def compare_scenarios(scenarios, year=None, month=None):
    """Compare multiple scenarios side by side."""
    if not year:
        year = date.today().year
    if not month:
        month = date.today().month

    base = _get_base_monthly(year, month)
    results = [{"name": "Nuläge", **base}]

    for scenario in scenarios:
        result = calculate_scenario(scenario, year, month)
        results.append({
            "name": scenario.name,
            **result["modified"],
            "diff_remaining": result["diff"]["remaining"],
        })

    return {"year": year, "month": month, "scenarios": results}


def _get_base_monthly(year, month):
    """Get the base monthly financial summary."""
    from extensions import db

    # Income
    income_cats = Category.query.filter_by(category_type="income").all()
    income_ids = [c.id for c in income_cats]

    income = 0
    if income_ids:
        result = db.session.query(func.sum(BudgetItem.amount)).filter(
            BudgetItem.category_id.in_(income_ids),
            BudgetItem.year == year,
            ((BudgetItem.month == month) | (BudgetItem.month.is_(None)))
        ).scalar()
        income = float(result) if result else 0

    # For yearly items, divide by 12
    yearly_income = db.session.query(func.sum(BudgetItem.amount)).filter(
        BudgetItem.category_id.in_(income_ids) if income_ids else False,
        BudgetItem.year == year,
        BudgetItem.month.is_(None)
    ).scalar()
    if yearly_income:
        # Yearly items already included above, but need to divide by 12
        monthly_items = db.session.query(func.sum(BudgetItem.amount)).filter(
            BudgetItem.category_id.in_(income_ids) if income_ids else False,
            BudgetItem.year == year,
            BudgetItem.month == month
        ).scalar()
        income = float(monthly_items or 0) + float(yearly_income or 0) / 12

    # Expenses
    expense_cats = Category.query.filter_by(category_type="expense").all()
    expense_ids = [c.id for c in expense_cats]

    expenses = 0
    if expense_ids:
        monthly_exp = db.session.query(func.sum(BudgetItem.amount)).filter(
            BudgetItem.category_id.in_(expense_ids),
            BudgetItem.year == year,
            BudgetItem.month == month
        ).scalar()
        yearly_exp = db.session.query(func.sum(BudgetItem.amount)).filter(
            BudgetItem.category_id.in_(expense_ids),
            BudgetItem.year == year,
            BudgetItem.month.is_(None)
        ).scalar()
        expenses = float(monthly_exp or 0) + float(yearly_exp or 0) / 12

    # Loan interest costs
    loans = Loan.query.all()
    interest_cost = sum(loan.monthly_interest_cost() for loan in loans)
    amortization = sum(float(loan.monthly_amortization) for loan in loans)

    remaining = income - expenses - interest_cost - amortization

    return {
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "interest_cost": round(interest_cost, 2),
        "amortization": round(amortization, 2),
        "remaining": round(remaining, 2),
    }


def _apply_loan_rate(modified, override):
    """Apply a loan rate change override."""
    loan = Loan.query.get(override.target_id)
    if not loan:
        return
    old_interest = loan.monthly_interest_cost()
    new_rate = override.params.get("rate", float(loan.interest_rate))
    new_interest = calculate_monthly_interest(float(loan.current_balance), new_rate)
    diff = new_interest - old_interest
    modified["interest_cost"] = round(modified["interest_cost"] + diff, 2)
    modified["remaining"] = round(modified["remaining"] - diff, 2)


def _apply_new_loan(modified, override):
    """Apply a new loan override."""
    params = override.params
    balance = params.get("balance", 0)
    rate = params.get("rate", 0)
    amortization = params.get("monthly_amortization", 0)
    new_interest = calculate_monthly_interest(balance, rate)
    modified["interest_cost"] = round(modified["interest_cost"] + new_interest, 2)
    modified["amortization"] = round(modified["amortization"] + amortization, 2)
    modified["remaining"] = round(modified["remaining"] - new_interest - amortization, 2)


def _apply_income_change(modified, override):
    """Apply an income change override."""
    amount = override.params.get("amount", 0)
    modified["income"] = round(modified["income"] + amount, 2)
    modified["remaining"] = round(modified["remaining"] + amount, 2)


def _apply_expense_change(modified, override):
    """Apply an expense change override."""
    amount = override.params.get("amount", 0)
    modified["expenses"] = round(modified["expenses"] + amount, 2)
    modified["remaining"] = round(modified["remaining"] - amount, 2)
