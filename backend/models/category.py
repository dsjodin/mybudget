from extensions import db
from datetime import datetime, timezone


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="CASCADE"), nullable=True
    )
    name = db.Column(db.String(100), nullable=False)
    sort_order = db.Column(db.Integer, default=0)
    category_type = db.Column(db.String(20), nullable=False)  # income, expense, savings
    budget_mode = db.Column(db.String(10), default="monthly")  # monthly, yearly
    payment_account_id = db.Column(
        db.Integer, db.ForeignKey("payment_accounts.id", ondelete="SET NULL"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    children = db.relationship(
        "Category", backref=db.backref("parent", remote_side=[id]), lazy="dynamic"
    )
    payment_account = db.relationship("PaymentAccount", backref="categories")

    def to_dict(self):
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "name": self.name,
            "sort_order": self.sort_order,
            "category_type": self.category_type,
            "budget_mode": self.budget_mode,
            "payment_account_id": self.payment_account_id,
            "payment_account_name": self.payment_account.name if self.payment_account else None,
        }
