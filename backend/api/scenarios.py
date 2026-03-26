from flask import Blueprint, request, jsonify
from extensions import db
from models.scenario import Scenario, ScenarioOverride
from services.scenario_engine import calculate_scenario, compare_scenarios

bp = Blueprint("scenarios", __name__, url_prefix="/api/scenarios")


@bp.route("", methods=["GET"])
def list_scenarios():
    scenarios = Scenario.query.order_by(Scenario.created_at.desc()).all()
    return jsonify([s.to_dict() for s in scenarios])


@bp.route("", methods=["POST"])
def create_scenario():
    data = request.get_json()
    scenario = Scenario(
        name=data["name"],
        description=data.get("description"),
    )
    db.session.add(scenario)
    db.session.flush()

    for override_data in data.get("overrides", []):
        override = ScenarioOverride(
            scenario_id=scenario.id,
            override_type=override_data["override_type"],
            target_id=override_data.get("target_id"),
            params=override_data["params"],
        )
        db.session.add(override)

    db.session.commit()
    return jsonify(scenario.to_dict()), 201


@bp.route("/<int:id>", methods=["PUT"])
def update_scenario(id):
    scenario = Scenario.query.get_or_404(id)
    data = request.get_json()
    scenario.name = data.get("name", scenario.name)
    scenario.description = data.get("description", scenario.description)
    scenario.is_active = data.get("is_active", scenario.is_active)

    if "overrides" in data:
        # Replace all overrides
        ScenarioOverride.query.filter_by(scenario_id=id).delete()
        for override_data in data["overrides"]:
            override = ScenarioOverride(
                scenario_id=id,
                override_type=override_data["override_type"],
                target_id=override_data.get("target_id"),
                params=override_data["params"],
            )
            db.session.add(override)

    db.session.commit()
    return jsonify(scenario.to_dict())


@bp.route("/<int:id>", methods=["DELETE"])
def delete_scenario(id):
    scenario = Scenario.query.get_or_404(id)
    db.session.delete(scenario)
    db.session.commit()
    return "", 204


@bp.route("/<int:id>/calculate", methods=["GET"])
def calc_scenario(id):
    scenario = Scenario.query.get_or_404(id)
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    result = calculate_scenario(scenario, year=year, month=month)
    return jsonify(result)


@bp.route("/compare", methods=["GET"])
def compare():
    ids_str = request.args.get("ids", "")
    ids = [int(x) for x in ids_str.split(",") if x.strip()]
    scenarios = Scenario.query.filter(Scenario.id.in_(ids)).all()
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    result = compare_scenarios(scenarios, year=year, month=month)
    return jsonify(result)
