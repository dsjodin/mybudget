from flask import Blueprint, request, jsonify
from extensions import db
from models.transaction import Transaction
from sqlalchemy import extract

bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


@bp.route("", methods=["GET"])
def list_transactions():
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    category_id = request.args.get("category_id", type=int)

    query = Transaction.query
    if year:
        query = query.filter(extract("year", Transaction.date) == year)
    if month:
        query = query.filter(extract("month", Transaction.date) == month)
    if category_id:
        query = query.filter_by(category_id=category_id)

    transactions = query.order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions])


@bp.route("", methods=["POST"])
def create_transaction():
    data = request.get_json()
    transaction = Transaction(
        category_id=data["category_id"],
        date=data["date"],
        amount=data["amount"],
        description=data.get("description"),
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify(transaction.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    data = request.get_json()
    transaction.category_id = data.get("category_id", transaction.category_id)
    transaction.date = data.get("date", transaction.date)
    transaction.amount = data.get("amount", transaction.amount)
    transaction.description = data.get("description", transaction.description)
    db.session.commit()
    return jsonify(transaction.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    db.session.delete(transaction)
    db.session.commit()
    return "", 204
