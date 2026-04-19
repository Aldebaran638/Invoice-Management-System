import uuid
from datetime import date

from sqlmodel import SQLModel


class PurchaseRecordSummaryRecord(SQLModel):
    id: uuid.UUID
    purchase_date: date
    name: str
    amount: float | None


class PurchaseRecordSummaryListData(SQLModel):
    records: list[PurchaseRecordSummaryRecord]


class PurchaseRecordSummaryListResponse(SQLModel):
    data: PurchaseRecordSummaryListData


class PurchaseRecordSummaryDetailResponse(SQLModel):
    data: PurchaseRecordSummaryRecord
