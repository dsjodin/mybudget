import os


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://mybudget:mybudget_dev@db:5432/mybudget"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
