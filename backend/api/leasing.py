from flask import Blueprint, request, jsonify
from extensions import db
from models.leasing import LeasingContract

bp = Blueprint("leasing", __name__, url_prefix="/api/leasing")


@bp.route("", methods=["GET"])
def list_contracts():
    contracts = LeasingContract.query.order_by(LeasingContract.end_date).all()
    return jsonify([c.to_dict() for c in contracts])


@bp.route("", methods=["POST"])
def create_contract():
    data = request.get_json()
    contract = LeasingContract(
        vehicle_name=data["vehicle_name"],
        monthly_cost=data["monthly_cost"],
        start_date=data["start_date"],
        end_date=data["end_date"],
        term_months=data["term_months"],
        residual_value=data.get("residual_value"),
        mileage_limit=data.get("mileage_limit"),
        category_id=data.get("category_id"),
        payment_account_id=data.get("payment_account_id"),
        note=data.get("note"),
    )
    db.session.add(contract)
    db.session.commit()
    return jsonify(contract.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_contract(id):
    contract = LeasingContract.query.get_or_404(id)
    data = request.get_json()
    for field in ["vehicle_name", "monthly_cost", "start_date", "end_date",
                   "term_months", "residual_value", "mileage_limit",
                   "category_id", "payment_account_id", "note"]:
        if field in data:
            setattr(contract, field, data[field])
    db.session.commit()
    return jsonify(contract.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_contract(id):
    contract = LeasingContract.query.get_or_404(id)
    db.session.delete(contract)
    db.session.commit()
    return "", 204
