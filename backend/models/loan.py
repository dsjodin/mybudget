from extensions import db
from datetime import datetime, timezone


class Loan(db.Model):
    __tablename__ = "loans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    lender = db.Column(db.String(100), nullable=True)
    original_amount = db.Column(db.Numeric(14, 2), nullable=False)
    current_balance = db.Column(db.Numeric(14, 2), nullable=False)
    interest_rate = db.Column(db.Numeric(5, 4), nullable=False)  # 0.0250 = 2.50%
    rate_type = db.Column(db.String(10), default="variable")  # fixed, variable
    rate_fixed_until = db.Column(db.Date, nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    monthly_amortization = db.Column(db.Numeric(12, 2), default=0)
    loan_type = db.Column(db.String(20), nullable=False, default="mortgage")  # mortgage, car, consumer
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    category = db.relationship("Category", backref="loans")
    rate_history = db.relationship(
        "LoanRateHistory", backref="loan", cascade="all, delete-orphan",
        order_by="LoanRateHistory.effective_date.desc()"
    )

    def monthly_interest_cost(self):
        """Calculate monthly interest cost based on current balance and rate."""
        return float(self.current_balance * self.interest_rate / 12)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "lender": self.lender,
            "original_amount": float(self.original_amount),
            "current_balance": float(self.current_balance),
            "interest_rate": float(self.interest_rate),
            "rate_type": self.rate_type,
            "rate_fixed_until": self.rate_fixed_until.isoformat() if self.rate_fixed_until else None,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "monthly_amortization": float(self.monthly_amortization),
            "monthly_interest_cost": self.monthly_interest_cost(),
            "loan_type": self.loan_type,
            "category_id": self.category_id,
        }


class LoanRateHistory(db.Model):
    __tablename__ = "loan_rate_history"

    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(
        db.Integer, db.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False
    )
    rate = db.Column(db.Numeric(5, 4), nullable=False)
    effective_date = db.Column(db.Date, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "loan_id": self.loan_id,
            "rate": float(self.rate),
            "effective_date": self.effective_date.isoformat(),
        }
