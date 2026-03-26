from extensions import db
from datetime import datetime, timezone


class BudgetItem(db.Model):
    __tablename__ = "budget_items"
    __table_args__ = (
        db.UniqueConstraint("category_id", "year", "month", name="uq_budget_cat_year_month"),
    )

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id"), nullable=False
    )
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=True)  # NULL = yearly budget
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    note = db.Column(db.Text, nullable=True)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    category = db.relationship("Category", backref="budget_items")

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "year": self.year,
            "month": self.month,
            "amount": float(self.amount),
            "note": self.note,
        }
