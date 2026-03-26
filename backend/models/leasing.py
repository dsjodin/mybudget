from extensions import db
from datetime import datetime, date, timezone


class LeasingContract(db.Model):
    __tablename__ = "leasing_contracts"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_name = db.Column(db.String(100), nullable=False)
    monthly_cost = db.Column(db.Numeric(12, 2), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    term_months = db.Column(db.Integer, nullable=False)
    residual_value = db.Column(db.Numeric(12, 2), nullable=True)
    mileage_limit = db.Column(db.Integer, nullable=True)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id"), nullable=True
    )
    payment_account_id = db.Column(
        db.Integer, db.ForeignKey("payment_accounts.id", ondelete="SET NULL"), nullable=True
    )
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    category = db.relationship("Category", backref="leasing_contracts")
    payment_account = db.relationship("PaymentAccount", backref="leasing_contracts")

    def months_remaining(self):
        today = date.today()
        if today >= self.end_date:
            return 0
        return (self.end_date.year - today.year) * 12 + (self.end_date.month - today.month)

    def progress_percent(self):
        today = date.today()
        total_days = (self.end_date - self.start_date).days
        elapsed = (today - self.start_date).days
        if total_days <= 0:
            return 100
        return min(100, max(0, round(elapsed / total_days * 100)))

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_name": self.vehicle_name,
            "monthly_cost": float(self.monthly_cost),
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "term_months": self.term_months,
            "residual_value": float(self.residual_value) if self.residual_value else None,
            "mileage_limit": self.mileage_limit,
            "category_id": self.category_id,
            "payment_account_id": self.payment_account_id,
            "note": self.note,
            "months_remaining": self.months_remaining(),
            "progress_percent": self.progress_percent(),
        }
