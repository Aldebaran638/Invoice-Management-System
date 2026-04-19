import uuid
from datetime import date, datetime

from sqlmodel import SQLModel


class RecycleBinRecord(SQLModel):
    id: uuid.UUID
    purchase_date: date
    name: str
    amount: float | None
    deleted_at: datetime | None


class RecycleBinListData(SQLModel):
    records: list[RecycleBinRecord]


class RecycleBinListResponse(SQLModel):
    data: RecycleBinListData


class RecycleBinDetailResponse(SQLModel):
    data: RecycleBinRecord


class RecycleBinRestoreResponse(SQLModel):
    message: str
