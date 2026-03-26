from extensions import db
from datetime import datetime, timezone


class DistributionSetting(db.Model):
    __tablename__ = "distribution_settings"

    id = db.Column(db.Integer, primary_key=True)
    savings_account_id = db.Column(
        db.Integer, db.ForeignKey("savings_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    percentage = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    sort_order = db.Column(db.Integer, default=0)

    account = db.relationship("SavingsAccount", backref="distribution_setting")

    def to_dict(self):
        return {
            "id": self.id,
            "savings_account_id": self.savings_account_id,
            "percentage": float(self.percentage),
            "sort_order": self.sort_order,
            "account_name": self.account.name if self.account else None,
            "account_balance": float(self.account.current_balance) if self.account else 0,
        }


class AppSetting(db.Model):
    __tablename__ = "app_settings"

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.String(255), nullable=False)

    @staticmethod
    def get(key, default=None):
        setting = AppSetting.query.get(key)
        return setting.value if setting else default

    @staticmethod
    def set(key, value):
        setting = AppSetting.query.get(key)
        if setting:
            setting.value = str(value)
        else:
            setting = AppSetting(key=key, value=str(value))
            db.session.add(setting)
        return setting
