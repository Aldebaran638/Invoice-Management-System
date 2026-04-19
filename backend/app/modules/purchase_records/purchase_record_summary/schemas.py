import uuid
from datetime import date

from sqlmodel import SQLModel


class PurchaseRecordSummaryRecord(SQLModel):
    id: uuid.UUID
    purchase_date: date
    name: str
    amount: float | None
    founder_name: str
    major_category_id: int
    major_category_name: str
    sub_category_id: int | None
    sub_category_name: str | None
    purchase_image_url: str | None
    remarks: str | None


class PurchaseRecordSummaryListData(SQLModel):
    list: list[PurchaseRecordSummaryRecord]
    total: int


class ApiRequestEnvelope(SQLModel):
    request_id: str
    ts: int


class PurchaseRecordSummaryCreate(SQLModel):
    purchase_date: date
    name: str
    amount: float | None = None
    founder_name: str
    major_category_id: int
    sub_category_id: int | None = None
    purchase_image_url: str | None = None
    remarks: str | None = None


class PurchaseRecordSummaryUpdate(PurchaseRecordSummaryCreate):
    pass


class PurchaseRecordUpsertPayload(PurchaseRecordSummaryCreate):
    pass


class PurchaseRecordUpsertRequest(ApiRequestEnvelope):
    payload: PurchaseRecordUpsertPayload


class PurchaseRecordDeleteData(SQLModel):
    message: str


class ApiSuccessBase(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int


class PurchaseRecordSummaryListResponse(ApiSuccessBase):
    data: PurchaseRecordSummaryListData


class PurchaseRecordSummaryDetailResponse(ApiSuccessBase):
    data: PurchaseRecordSummaryRecord


class PurchaseRecordSummaryDeleteResponse(ApiSuccessBase):
    data: PurchaseRecordDeleteData
