import uuid
from datetime import date, datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class PurchaseRecord(SQLModel, table=True):
    __tablename__ = "purchase_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    purchase_date: date
    name: str = Field(max_length=255)
    amount: float | None = None
    is_deleted: bool = Field(
        default=False,
        nullable=False,
        sa_column_kwargs={"server_default": "false"},
    )
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
