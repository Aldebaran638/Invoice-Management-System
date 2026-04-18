import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Column, Numeric
from sqlmodel import Field, Relationship, SQLModel


class PurchaseCategory(SQLModel, table=True):
    __tablename__ = "purchase_category"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    is_active: bool = Field(default=True, nullable=False, index=True)

    subcategories: list["PurchaseSubcategory"] = Relationship(back_populates="category")
    records: list["PurchaseRecord"] = Relationship(back_populates="category")


class PurchaseSubcategory(SQLModel, table=True):
    __tablename__ = "purchase_subcategory"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category_id: uuid.UUID = Field(
        foreign_key="purchase_category.id", nullable=False, index=True
    )
    name: str
    is_active: bool = Field(default=True, nullable=False, index=True)

    category: PurchaseCategory | None = Relationship(back_populates="subcategories")
    records: list["PurchaseRecord"] = Relationship(back_populates="subcategory")


class PurchaseRecord(SQLModel, table=True):
    __tablename__ = "purchase_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    remark: str | None = None
    amount: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )
    purchase_date: date
    category_id: uuid.UUID = Field(
        foreign_key="purchase_category.id", nullable=False, index=True
    )
    subcategory_id: uuid.UUID | None = Field(
        default=None, foreign_key="purchase_subcategory.id", nullable=True, index=True
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, index=True, ondelete="CASCADE"
    )
    is_deleted: bool = Field(default=False, nullable=False, index=True)
    deleted_at: datetime | None = Field(default=None, nullable=True)

    category: PurchaseCategory | None = Relationship(back_populates="records")
    subcategory: PurchaseSubcategory | None = Relationship(back_populates="records")
