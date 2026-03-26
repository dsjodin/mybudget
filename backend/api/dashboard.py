from flask import Blueprint, request, jsonify
from services.budget_aggregator import get_summary, get_trends, get_distribution

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.route("/summary", methods=["GET"])
def summary():
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    return jsonify(get_summary(year, month))


@bp.route("/trends", methods=["GET"])
def trends():
    year = request.args.get("year", type=int)
    return jsonify(get_trends(year))


@bp.route("/distribution", methods=["GET"])
def distribution():
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    return jsonify(get_distribution(year, month))
