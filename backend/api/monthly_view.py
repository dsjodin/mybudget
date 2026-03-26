from flask import Blueprint, request, jsonify
from extensions import db
from models.category import Category
from models.budget_item import BudgetItem
from models.transaction import Transaction
from models.loan import Loan
from models.leasing import LeasingContract
from models.savings_account import SavingsAccount
from models.distribution_setting import DistributionSetting, AppSetting
from sqlalchemy import func, extract
from datetime import date

bp = Blueprint("monthly_view", __name__, url_prefix="/api/monthly-view")


@bp.route("", methods=["GET"])
def monthly_view():
    year = request.args.get("year", type=int) or date.today().year
    month = request.args.get("month", type=int) or date.today().month

    # Load all data
    categories = Category.query.order_by(Category.sort_order).all()
    cat_map = {c.id: c for c in categories}

    # Budget items for this month
    budget_items = BudgetItem.query.filter(
        BudgetItem.year == year,
        ((BudgetItem.month == month) | (BudgetItem.month.is_(None)))
    ).all()
    budget_map = {}
    for bi in budget_items:
        amount = float(bi.amount)
        if bi.month is None:
            amount = amount / 12
        budget_map[bi.category_id] = round(amount, 2)

    # Actual transactions for this month
    actuals = db.session.query(
        Transaction.category_id,
        func.sum(Transaction.amount).label("total")
    ).filter(
        extract("year", Transaction.date) == year,
        extract("month", Transaction.date) == month,
    ).group_by(Transaction.category_id).all()
    actual_map = {a.category_id: float(a.total) for a in actuals}

    # Build category hierarchy
    top_level = [c for c in categories if c.parent_id is None]
    children_map = {}
    for c in categories:
        if c.parent_id:
            children_map.setdefault(c.parent_id, []).append(c)

    def build_category_section(cat_type):
        """Build sections grouped by top-level categories."""
        sections = []
        for parent in top_level:
            if parent.category_type != cat_type:
                continue
            children = children_map.get(parent.id, [])
            if children:
                # Parent with children - show children as rows
                items = []
                section_budget = 0
                section_actual = 0
                for child in children:
                    b = budget_map.get(child.id, 0)
                    a = actual_map.get(child.id, 0)
                    section_budget += b
                    section_actual += a
                    items.append({
                        "id": child.id,
                        "name": child.name,
                        "budget": round(b, 2),
                        "actual": round(a, 2),
                    })
                # Also include parent's own budget/actual if any
                pb = budget_map.get(parent.id, 0)
                pa = actual_map.get(parent.id, 0)
                section_budget += pb
                section_actual += pa
                sections.append({
                    "id": parent.id,
                    "name": parent.name,
                    "items": items,
                    "subtotal_budget": round(section_budget, 2),
                    "subtotal_actual": round(section_actual, 2),
                })
            else:
                # Standalone category (no children)
                b = budget_map.get(parent.id, 0)
                a = actual_map.get(parent.id, 0)
                sections.append({
                    "id": parent.id,
                    "name": parent.name,
                    "items": [{
                        "id": parent.id,
                        "name": parent.name,
                        "budget": round(b, 2),
                        "actual": round(a, 2),
                    }],
                    "subtotal_budget": round(b, 2),
                    "subtotal_actual": round(a, 2),
                })
        return sections

    income_sections = build_category_section("income")
    expense_sections = build_category_section("expense")

    total_income_budget = sum(s["subtotal_budget"] for s in income_sections)
    total_income_actual = sum(s["subtotal_actual"] for s in income_sections)
    total_expense_budget = sum(s["subtotal_budget"] for s in expense_sections)
    total_expense_actual = sum(s["subtotal_actual"] for s in expense_sections)

    # Loans
    loans = Loan.query.order_by(Loan.name).all()
    loan_items = []
    total_interest = 0
    total_amortization = 0
    for loan in loans:
        interest = loan.monthly_interest_cost()
        amort = float(loan.monthly_amortization)
        total_interest += interest
        total_amortization += amort
        loan_items.append({
            "id": loan.id,
            "name": loan.name,
            "lender": loan.lender,
            "balance": float(loan.current_balance),
            "rate": float(loan.interest_rate),
            "rate_type": loan.rate_type,
            "interest": round(interest, 2),
            "amortization": round(amort, 2),
        })

    # Leasing
    leasing = LeasingContract.query.all()
    leasing_total = sum(float(c.monthly_cost) for c in leasing)

    # Grand totals (expenses + loan interest + amortization + leasing)
    grand_total_budget = total_expense_budget + total_interest + total_amortization + leasing_total
    grand_total_actual = total_expense_actual + total_interest + total_amortization + leasing_total

    remaining_budget = total_income_budget - grand_total_budget
    remaining_actual = total_income_actual - grand_total_actual

    # Distribution settings
    pocket_per_person = float(AppSetting.get("pocket_money_per_person", 3200))
    pocket_persons = int(AppSetting.get("pocket_money_persons", 2))
    pocket_total = pocket_per_person * pocket_persons

    distributable = remaining_actual - pocket_total

    dist_settings = DistributionSetting.query.order_by(
        DistributionSetting.sort_order
    ).all()

    dist_accounts = []
    for ds in dist_settings:
        amount = distributable * float(ds.percentage) / 100 if distributable > 0 else 0
        dist_accounts.append({
            "id": ds.id,
            "savings_account_id": ds.savings_account_id,
            "name": ds.account.name if ds.account else "?",
            "percentage": float(ds.percentage),
            "amount": round(amount, 2),
            "current_balance": float(ds.account.current_balance) if ds.account else 0,
        })

    return jsonify({
        "year": year,
        "month": month,
        "income": {
            "sections": income_sections,
            "total_budget": round(total_income_budget, 2),
            "total_actual": round(total_income_actual, 2),
        },
        "expenses": {
            "sections": expense_sections,
            "total_budget": round(total_expense_budget, 2),
            "total_actual": round(total_expense_actual, 2),
        },
        "loans": {
            "items": loan_items,
            "total_interest": round(total_interest, 2),
            "total_amortization": round(total_amortization, 2),
        },
        "leasing": {
            "items": [c.to_dict() for c in leasing],
            "total_cost": round(leasing_total, 2),
        },
        "grand_total": {
            "budget": round(grand_total_budget, 2),
            "actual": round(grand_total_actual, 2),
        },
        "remaining": {
            "budget": round(remaining_budget, 2),
            "actual": round(remaining_actual, 2),
        },
        "distribution": {
            "pocket_money_per_person": pocket_per_person,
            "pocket_money_persons": pocket_persons,
            "pocket_money_total": pocket_total,
            "distributable": round(max(distributable, 0), 2),
            "accounts": dist_accounts,
        },
    })
