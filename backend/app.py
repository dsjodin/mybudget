from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, migrate


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so Alembic can detect them
    import models  # noqa: F401

    # Register API blueprints
    from api.categories import bp as categories_bp
    from api.budget import bp as budget_bp
    from api.transactions import bp as transactions_bp
    from api.loans import bp as loans_bp
    from api.leasing import bp as leasing_bp
    from api.savings import bp as savings_bp
    from api.scenarios import bp as scenarios_bp
    from api.dashboard import bp as dashboard_bp

    app.register_blueprint(categories_bp)
    app.register_blueprint(budget_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(loans_bp)
    app.register_blueprint(leasing_bp)
    app.register_blueprint(savings_bp)
    app.register_blueprint(scenarios_bp)
    app.register_blueprint(dashboard_bp)

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app
