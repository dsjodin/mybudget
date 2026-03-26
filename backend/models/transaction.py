from extensions import db
from datetime import datetime, timezone


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id"), nullable=False
    )
    date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    category = db.relationship("Category", backref="transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "date": self.date.isoformat(),
            "amount": float(self.amount),
            "description": self.description,
        }
