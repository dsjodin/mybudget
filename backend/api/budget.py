from flask import Blueprint, request, jsonify
from extensions import db
from models.budget_item import BudgetItem

bp = Blueprint("budget", __name__, url_prefix="/api/budget")


@bp.route("", methods=["GET"])
def list_budget():
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)

    query = BudgetItem.query
    if year:
        query = query.filter_by(year=year)
    if month:
        query = query.filter(
            (BudgetItem.month == month) | (BudgetItem.month.is_(None))
        )

    items = query.all()
    return jsonify([item.to_dict() for item in items])


@bp.route("", methods=["POST"])
def create_or_update_budget():
    data = request.get_json()
    category_id = data["category_id"]
    year = data["year"]
    month = data.get("month")

    item = BudgetItem.query.filter_by(
        category_id=category_id, year=year, month=month
    ).first()

    if item:
        item.amount = data["amount"]
        item.note = data.get("note", item.note)
    else:
        item = BudgetItem(
            category_id=category_id,
            year=year,
            month=month,
            amount=data["amount"],
            note=data.get("note"),
        )
        db.session.add(item)

    db.session.commit()
    return jsonify(item.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_budget(id):
    item = BudgetItem.query.get_or_404(id)
    data = request.get_json()
    item.amount = data.get("amount", item.amount)
    item.note = data.get("note", item.note)
    db.session.commit()
    return jsonify(item.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_budget(id):
    item = BudgetItem.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return "", 204


@bp.route("/copy-month", methods=["POST"])
def copy_month():
    data = request.get_json()
    src_year = data["source_year"]
    src_month = data["source_month"]
    dst_year = data["target_year"]
    dst_month = data["target_month"]

    source_items = BudgetItem.query.filter_by(year=src_year, month=src_month).all()
    count = 0
    for src in source_items:
        existing = BudgetItem.query.filter_by(
            category_id=src.category_id, year=dst_year, month=dst_month
        ).first()
        if not existing:
            new_item = BudgetItem(
                category_id=src.category_id,
                year=dst_year,
                month=dst_month,
                amount=src.amount,
                note=src.note,
            )
            db.session.add(new_item)
            count += 1

    db.session.commit()
    return jsonify({"copied": count})
