import uuid
from datetime import date

from sqlmodel import Field, SQLModel


class PurchaseRecord(SQLModel, table=True):
    __tablename__ = "purchase_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    purchase_date: date
    name: str = Field(max_length=255)
    amount: float | None = None
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
