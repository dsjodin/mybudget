from flask import Blueprint, request, jsonify
from extensions import db
from models.category import Category
from models.transaction import Transaction
from models.loan import Loan
from models.leasing import LeasingContract
from models.savings_account import SavingsAccount
from models.distribution_setting import DistributionSetting, AppSetting
from models.payment_account import PaymentAccount
from sqlalchemy import func, extract
from datetime import date

bp = Blueprint("monthly_view", __name__, url_prefix="/api/monthly-view")


def get_month_data(year, month, categories, top_level, children_map):
    """Get transaction totals for a single month."""
    actuals = db.session.query(
        Transaction.category_id,
        func.sum(Transaction.amount).label("total")
    ).filter(
        extract("year", Transaction.date) == year,
        extract("month", Transaction.date) == month,
    ).group_by(Transaction.category_id).all()
    return {a.category_id: round(float(a.total), 2) for a in actuals}


@bp.route("", methods=["GET"])
def monthly_view():
    """Multi-month view. Pass months as comma-separated: ?months=1,2,3&year=2026"""
    year = request.args.get("year", type=int) or date.today().year
    months_param = request.args.get("months", str(date.today().month))
    months = [int(m) for m in months_param.split(",") if m.strip()]

    # Load categories
    categories = Category.query.order_by(Category.sort_order).all()

    top_level = [c for c in categories if c.parent_id is None]
    children_map = {}
    for c in categories:
        if c.parent_id:
            children_map.setdefault(c.parent_id, []).append(c)

    # Get actuals per month
    month_actuals = {}
    for m in months:
        month_actuals[m] = get_month_data(year, m, categories, top_level, children_map)

    # Build category sections (exclude categories with linked_section)
    linked_cat_ids = {c.id for c in categories if c.linked_section}

    def build_sections(cat_type):
        sections = []
        for parent in top_level:
            if parent.category_type != cat_type:
                continue
            if parent.id in linked_cat_ids:
                continue
            children = [c for c in children_map.get(parent.id, []) if c.id not in linked_cat_ids]
            if children:
                items = []
                for child in children:
                    amounts = {}
                    for m in months:
                        amounts[str(m)] = month_actuals[m].get(child.id, 0)
                    items.append({
                        "id": child.id,
                        "name": child.name,
                        "amounts": amounts,
                    })
                # Section subtotals per month
                subtotals = {}
                for m in months:
                    subtotals[str(m)] = sum(
                        month_actuals[m].get(child.id, 0) for child in children
                    ) + month_actuals[m].get(parent.id, 0)
                sections.append({
                    "id": parent.id,
                    "name": parent.name,
                    "items": items,
                    "subtotals": subtotals,
                })
            else:
                amounts = {}
                for m in months:
                    amounts[str(m)] = month_actuals[m].get(parent.id, 0)
                sections.append({
                    "id": parent.id,
                    "name": parent.name,
                    "items": [{
                        "id": parent.id,
                        "name": parent.name,
                        "amounts": amounts,
                    }],
                    "subtotals": amounts,
                })
        return sections

    income_sections = build_sections("income")
    expense_sections = build_sections("expense")

    # Build linked category items per section (cars, mortgage, consumer_loan)
    linked_items = {}  # section -> list of {id, name, amounts}
    linked_totals = {}  # section -> {month_str: total}
    for c in categories:
        if c.linked_section:
            amounts = {}
            for m in months:
                amounts[str(m)] = month_actuals[m].get(c.id, 0)
            linked_items.setdefault(c.linked_section, []).append({
                "id": c.id,
                "name": c.name,
                "amounts": amounts,
            })
            for m in months:
                ms = str(m)
                linked_totals.setdefault(c.linked_section, {})
                linked_totals[c.linked_section][ms] = linked_totals[c.linked_section].get(ms, 0) + amounts[ms]

    # Totals per month
    income_totals = {}
    expense_totals = {}
    for m in months:
        ms = str(m)
        income_totals[ms] = round(sum(s["subtotals"].get(ms, 0) for s in income_sections), 2)
        expense_totals[ms] = round(sum(s["subtotals"].get(ms, 0) for s in expense_sections), 2)

    # Loans (same for all months - current snapshot)
    loans = Loan.query.order_by(Loan.name).all()
    mortgage_items = []
    car_loan_items = []
    consumer_loan_items = []
    total_interest = 0
    total_amortization = 0

    for loan in loans:
        interest = loan.monthly_interest_cost()
        amort = float(loan.monthly_amortization)
        total_interest += interest
        total_amortization += amort
        item = {
            "id": loan.id,
            "name": loan.name,
            "lender": loan.lender,
            "balance": float(loan.current_balance),
            "rate": float(loan.interest_rate),
            "rate_type": loan.rate_type,
            "loan_type": loan.loan_type,
            "interest": round(interest, 2),
            "amortization": round(amort, 2),
        }
        if loan.loan_type == "mortgage":
            mortgage_items.append(item)
        elif loan.loan_type == "car":
            car_loan_items.append(item)
        else:
            consumer_loan_items.append(item)

    # Leasing
    leasing = LeasingContract.query.all()
    leasing_total = sum(float(c.monthly_cost) for c in leasing)

    # Fixed monthly costs (loans + leasing) - same each month
    fixed_monthly = round(total_interest + total_amortization + leasing_total, 2)

    # Grand totals & remaining per month
    grand_totals = {}
    remaining = {}
    total_linked = {}
    for m in months:
        ms = str(m)
        linked_sum = sum(section_totals.get(ms, 0) for section_totals in linked_totals.values())
        total_linked[ms] = round(linked_sum, 2)
        gt = expense_totals[ms] + fixed_monthly + linked_sum
        grand_totals[ms] = round(gt, 2)
        remaining[ms] = round(income_totals[ms] - gt, 2)

    # Distribution
    pocket_per_person = float(AppSetting.get("pocket_money_per_person", 3200))
    pocket_persons = int(AppSetting.get("pocket_money_persons", 2))
    pocket_total = pocket_per_person * pocket_persons

    dist_settings = DistributionSetting.query.order_by(
        DistributionSetting.sort_order
    ).all()

    # Distribution per month
    distribution_per_month = {}
    for m in months:
        ms = str(m)
        distributable = remaining[ms] - pocket_total
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
        distribution_per_month[ms] = {
            "distributable": round(max(distributable, 0), 2),
            "accounts": dist_accounts,
        }

    # Payment account summary: sum expenses per payment account per month
    payment_accounts = PaymentAccount.query.order_by(PaymentAccount.sort_order).all()
    cat_account_map = {c.id: c.payment_account_id for c in categories if c.payment_account_id}

    # Also map parent account to children that don't have their own
    for c in categories:
        if c.parent_id and c.id not in cat_account_map and c.parent_id in cat_account_map:
            cat_account_map[c.id] = cat_account_map[c.parent_id]

    # Build per-loan and per-leasing payment account costs (fixed monthly, same each month)
    loan_pa_costs = {}  # payment_account_id -> monthly cost
    for loan in loans:
        if loan.payment_account_id:
            cost = float(loan.monthly_amortization) + loan.monthly_interest_cost()
            loan_pa_costs[loan.payment_account_id] = loan_pa_costs.get(loan.payment_account_id, 0) + cost

    for lc in leasing:
        if lc.payment_account_id:
            loan_pa_costs[lc.payment_account_id] = loan_pa_costs.get(lc.payment_account_id, 0) + float(lc.monthly_cost)

    account_summaries = []
    for pa in payment_accounts:
        pa_cat_ids = [cid for cid, paid in cat_account_map.items() if paid == pa.id]
        loan_cost = round(loan_pa_costs.get(pa.id, 0), 2)
        totals_per_month = {}
        for m in months:
            ms = str(m)
            cat_total = sum(month_actuals[m].get(cid, 0) for cid in pa_cat_ids)
            totals_per_month[ms] = round(cat_total + loan_cost, 2)
        account_summaries.append({
            "id": pa.id,
            "name": pa.name,
            "totals": totals_per_month,
        })

    return jsonify({
        "year": year,
        "months": months,
        "income": {
            "sections": income_sections,
            "totals": income_totals,
        },
        "expenses": {
            "sections": expense_sections,
            "totals": expense_totals,
        },
        "loans": {
            "mortgages": mortgage_items,
            "car_loans": car_loan_items,
            "consumer_loans": consumer_loan_items,
            "total_interest": round(total_interest, 2),
            "total_amortization": round(total_amortization, 2),
        },
        "leasing": {
            "items": [c.to_dict() for c in leasing],
            "total_cost": round(leasing_total, 2),
        },
        "linked_categories": linked_items,
        "fixed_monthly": fixed_monthly,
        "grand_totals": grand_totals,
        "remaining": remaining,
        "distribution": {
            "pocket_money_per_person": pocket_per_person,
            "pocket_money_persons": pocket_persons,
            "pocket_money_total": pocket_total,
            "per_month": distribution_per_month,
        },
        "payment_accounts": account_summaries,
    })
