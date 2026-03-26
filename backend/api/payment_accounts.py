from flask import Blueprint, request, jsonify
from extensions import db
from models.payment_account import PaymentAccount

bp = Blueprint("payment_accounts", __name__, url_prefix="/api/payment-accounts")


@bp.route("", methods=["GET"])
def list_accounts():
    accounts = PaymentAccount.query.order_by(PaymentAccount.sort_order).all()
    return jsonify([a.to_dict() for a in accounts])


@bp.route("", methods=["POST"])
def create_account():
    data = request.get_json()
    account = PaymentAccount(
        name=data["name"],
        description=data.get("description"),
        sort_order=data.get("sort_order", 0),
    )
    db.session.add(account)
    db.session.commit()
    return jsonify(account.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_account(id):
    account = PaymentAccount.query.get_or_404(id)
    data = request.get_json()
    account.name = data.get("name", account.name)
    account.description = data.get("description", account.description)
    account.sort_order = data.get("sort_order", account.sort_order)
    db.session.commit()
    return jsonify(account.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_account(id):
    account = PaymentAccount.query.get_or_404(id)
    db.session.delete(account)
    db.session.commit()
    return "", 204
