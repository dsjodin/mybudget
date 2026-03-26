from flask import Blueprint, request, jsonify
from extensions import db
from models.savings_account import SavingsAccount, SavingsTransaction
from decimal import Decimal

bp = Blueprint("savings", __name__, url_prefix="/api/savings")


@bp.route("", methods=["GET"])
def list_accounts():
    accounts = SavingsAccount.query.order_by(SavingsAccount.name).all()
    return jsonify([a.to_dict() for a in accounts])


@bp.route("", methods=["POST"])
def create_account():
    data = request.get_json()
    account = SavingsAccount(
        name=data["name"],
        current_balance=data.get("current_balance", 0),
        interest_rate=data.get("interest_rate", 0),
        category_id=data.get("category_id"),
    )
    db.session.add(account)
    db.session.commit()
    return jsonify(account.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_account(id):
    account = SavingsAccount.query.get_or_404(id)
    data = request.get_json()
    account.name = data.get("name", account.name)
    account.interest_rate = data.get("interest_rate", account.interest_rate)
    account.category_id = data.get("category_id", account.category_id)
    db.session.commit()
    return jsonify(account.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_account(id):
    account = SavingsAccount.query.get_or_404(id)
    db.session.delete(account)
    db.session.commit()
    return "", 204


@bp.route("/<int:id>/transaction", methods=["POST"])
def add_transaction(id):
    account = SavingsAccount.query.get_or_404(id)
    data = request.get_json()
    amount = Decimal(str(data["amount"]))
    new_balance = account.current_balance + amount

    txn = SavingsTransaction(
        account_id=id,
        date=data["date"],
        amount=amount,
        balance_after=new_balance,
        description=data.get("description"),
    )
    account.current_balance = new_balance
    db.session.add(txn)
    db.session.commit()
    return jsonify(txn.to_dict()), 201


@bp.route("/<int:id>/transactions", methods=["GET"])
def list_transactions(id):
    SavingsAccount.query.get_or_404(id)
    txns = SavingsTransaction.query.filter_by(account_id=id).order_by(
        SavingsTransaction.date.desc()
    ).all()
    return jsonify([t.to_dict() for t in txns])


@bp.route("/<int:id>/set-balance", methods=["POST"])
def set_balance(id):
    """Manually adjust the balance (e.g. after reconciliation)."""
    account = SavingsAccount.query.get_or_404(id)
    data = request.get_json()
    new_balance = Decimal(str(data["balance"]))
    diff = new_balance - account.current_balance

    txn = SavingsTransaction(
        account_id=id,
        date=data["date"],
        amount=diff,
        balance_after=new_balance,
        description=data.get("description", "Manuell justering"),
    )
    account.current_balance = new_balance
    db.session.add(txn)
    db.session.commit()
    return jsonify(account.to_dict())
