import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import field_serializer
from sqlmodel import Field, SQLModel


class RequestEnvelope(SQLModel):
    request_id: str | None = None
    ts: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class ErrorBody(SQLModel):
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(SQLModel):
    version: str = "1.0"
    success: bool = False
    code: str
    message: str
    request_id: str
    ts: int
    error: ErrorBody


class PurchaseRecordPayload(SQLModel):
    title: str = Field(min_length=1)
    remark: str | None = None
    amount: Decimal
    purchase_date: date
    category_id: uuid.UUID
    subcategory_id: uuid.UUID | None = None


class PurchaseCategoryPayload(SQLModel):
    name: str = Field(min_length=1)
    is_active: bool


class PurchaseSubcategoryPayload(SQLModel):
    category_id: uuid.UUID
    name: str = Field(min_length=1)
    is_active: bool


class PurchaseRecordItem(SQLModel):
    id: uuid.UUID
    title: str
    remark: str | None = None
    amount: Decimal
    purchase_date: date
    category_id: uuid.UUID
    category_name: str
    subcategory_id: uuid.UUID | None = None
    subcategory_name: str | None = None
    owner_id: uuid.UUID
    owner_name: str

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> str:
        return f"{value:.2f}"


class PurchaseRecordListData(SQLModel):
    records: list[PurchaseRecordItem]
    total: int


class PurchaseRecordListResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseRecordListData


class PurchaseRecordDetailResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseRecordItem


class PurchaseRecordDeleteData(SQLModel):
    id: uuid.UUID
    is_deleted: bool
    deleted_at: str | None = None


class PurchaseRecordDeleteResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseRecordDeleteData


class PurchaseCategoryItem(SQLModel):
    id: uuid.UUID
    name: str
    is_active: bool


class PurchaseCategoryListData(SQLModel):
    categories: list[PurchaseCategoryItem]


class PurchaseCategoryListResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseCategoryListData


class PurchaseCategoryDetailResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseCategoryItem


class PurchaseSubcategoryItem(SQLModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str
    name: str
    is_active: bool


class PurchaseSubcategoryListData(SQLModel):
    subcategories: list[PurchaseSubcategoryItem]


class PurchaseSubcategoryListResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseSubcategoryListData


class PurchaseSubcategoryDetailResponse(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int
    data: PurchaseSubcategoryItem
