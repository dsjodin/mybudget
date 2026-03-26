from extensions import db
from datetime import datetime, timezone


class SavingsAccount(db.Model):
    __tablename__ = "savings_accounts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    current_balance = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    interest_rate = db.Column(db.Numeric(5, 4), default=0)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    category = db.relationship("Category", backref="savings_accounts")
    transactions = db.relationship(
        "SavingsTransaction", backref="account", cascade="all, delete-orphan",
        order_by="SavingsTransaction.date.desc()"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "current_balance": float(self.current_balance),
            "interest_rate": float(self.interest_rate),
            "category_id": self.category_id,
        }


class SavingsTransaction(db.Model):
    __tablename__ = "savings_transactions"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(
        db.Integer, db.ForeignKey("savings_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)  # positive=deposit, negative=withdrawal
    balance_after = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "date": self.date.isoformat(),
            "amount": float(self.amount),
            "balance_after": float(self.balance_after),
            "description": self.description,
        }
