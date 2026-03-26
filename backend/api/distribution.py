from flask import Blueprint, request, jsonify
from extensions import db
from models.distribution_setting import DistributionSetting, AppSetting

bp = Blueprint("distribution", __name__, url_prefix="/api/distribution-settings")


@bp.route("", methods=["GET"])
def get_settings():
    settings = DistributionSetting.query.order_by(DistributionSetting.sort_order).all()
    return jsonify({
        "pocket_money_per_person": float(AppSetting.get("pocket_money_per_person", 3200)),
        "pocket_money_persons": int(AppSetting.get("pocket_money_persons", 2)),
        "accounts": [s.to_dict() for s in settings],
    })


@bp.route("", methods=["PUT"])
def update_settings():
    data = request.get_json()

    if "pocket_money_per_person" in data:
        AppSetting.set("pocket_money_per_person", data["pocket_money_per_person"])
    if "pocket_money_persons" in data:
        AppSetting.set("pocket_money_persons", data["pocket_money_persons"])

    if "accounts" in data:
        # Clear existing and recreate
        DistributionSetting.query.delete()
        for i, acc in enumerate(data["accounts"]):
            ds = DistributionSetting(
                savings_account_id=acc["savings_account_id"],
                percentage=acc["percentage"],
                sort_order=i,
            )
            db.session.add(ds)

    db.session.commit()
    return get_settings()
