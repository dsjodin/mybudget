from flask import Blueprint, request, jsonify
from extensions import db
from models.loan import Loan, LoanRateHistory
from services.interest_calc import calculate_amortization_schedule
from datetime import date

bp = Blueprint("loans", __name__, url_prefix="/api/loans")


@bp.route("", methods=["GET"])
def list_loans():
    loan_type = request.args.get("type")
    query = Loan.query
    if loan_type:
        query = query.filter_by(loan_type=loan_type)
    loans = query.order_by(Loan.name).all()
    return jsonify([loan.to_dict() for loan in loans])


@bp.route("", methods=["POST"])
def create_loan():
    data = request.get_json()
    loan = Loan(
        name=data["name"],
        lender=data.get("lender"),
        original_amount=data["original_amount"],
        current_balance=data["current_balance"],
        interest_rate=data["interest_rate"],
        rate_type=data.get("rate_type", "variable"),
        rate_fixed_until=data.get("rate_fixed_until"),
        start_date=data["start_date"],
        end_date=data.get("end_date"),
        monthly_amortization=data.get("monthly_amortization", 0),
        loan_type=data.get("loan_type", "mortgage"),
        category_id=data.get("category_id"),
        payment_account_id=data.get("payment_account_id"),
    )
    db.session.add(loan)
    db.session.flush()

    # Save initial rate in history
    history = LoanRateHistory(
        loan_id=loan.id,
        rate=loan.interest_rate,
        effective_date=loan.start_date,
    )
    db.session.add(history)
    db.session.commit()
    return jsonify(loan.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_loan(id):
    loan = Loan.query.get_or_404(id)
    data = request.get_json()
    loan.name = data.get("name", loan.name)
    loan.lender = data.get("lender", loan.lender)
    loan.current_balance = data.get("current_balance", loan.current_balance)
    loan.rate_type = data.get("rate_type", loan.rate_type)
    loan.rate_fixed_until = data.get("rate_fixed_until", loan.rate_fixed_until)
    loan.end_date = data.get("end_date", loan.end_date)
    loan.monthly_amortization = data.get("monthly_amortization", loan.monthly_amortization)
    loan.loan_type = data.get("loan_type", loan.loan_type)
    loan.category_id = data.get("category_id", loan.category_id)
    if "payment_account_id" in data:
        loan.payment_account_id = data["payment_account_id"]
    db.session.commit()
    return jsonify(loan.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_loan(id):
    loan = Loan.query.get_or_404(id)
    db.session.delete(loan)
    db.session.commit()
    return "", 204


@bp.route("/<int:id>/update-rate", methods=["POST"])
def update_rate(id):
    loan = Loan.query.get_or_404(id)
    data = request.get_json()
    new_rate = data["rate"]
    effective_date = data.get("effective_date", date.today().isoformat())

    loan.interest_rate = new_rate
    history = LoanRateHistory(
        loan_id=loan.id,
        rate=new_rate,
        effective_date=effective_date,
    )
    db.session.add(history)
    db.session.commit()
    return jsonify(loan.to_dict())


@bp.route("/<int:id>/rate-history", methods=["GET"])
def rate_history(id):
    Loan.query.get_or_404(id)
    history = LoanRateHistory.query.filter_by(loan_id=id).order_by(
        LoanRateHistory.effective_date
    ).all()
    return jsonify([h.to_dict() for h in history])


@bp.route("/<int:id>/schedule", methods=["GET"])
def amortization_schedule(id):
    loan = Loan.query.get_or_404(id)
    months = request.args.get("months", 12, type=int)
    schedule = calculate_amortization_schedule(
        balance=float(loan.current_balance),
        annual_rate=float(loan.interest_rate),
        monthly_amortization=float(loan.monthly_amortization),
        months=months,
    )
    return jsonify(schedule)
