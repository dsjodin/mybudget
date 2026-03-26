from flask import Blueprint, request, jsonify
from extensions import db
from models.category import Category

bp = Blueprint("categories", __name__, url_prefix="/api/categories")


@bp.route("", methods=["GET"])
def list_categories():
    categories = Category.query.order_by(Category.sort_order, Category.id).all()
    return jsonify([c.to_dict() for c in categories])


@bp.route("", methods=["POST"])
def create_category():
    data = request.get_json()
    category = Category(
        parent_id=data.get("parent_id"),
        name=data["name"],
        sort_order=data.get("sort_order", 0),
        category_type=data["category_type"],
        budget_mode=data.get("budget_mode", "monthly"),
    )
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_category(id):
    category = Category.query.get_or_404(id)
    data = request.get_json()
    category.name = data.get("name", category.name)
    category.parent_id = data.get("parent_id", category.parent_id)
    category.sort_order = data.get("sort_order", category.sort_order)
    category.category_type = data.get("category_type", category.category_type)
    category.budget_mode = data.get("budget_mode", category.budget_mode)
    db.session.commit()
    return jsonify(category.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_category(id):
    category = Category.query.get_or_404(id)
    db.session.delete(category)
    db.session.commit()
    return "", 204


@bp.route("/reorder", methods=["PATCH"])
def reorder_categories():
    data = request.get_json()
    for item in data.get("order", []):
        cat = Category.query.get(item["id"])
        if cat:
            cat.sort_order = item["sort_order"]
    db.session.commit()
    return jsonify({"status": "ok"})
