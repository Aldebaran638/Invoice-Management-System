from sqlmodel import SQLModel


class ExpenseCategoryRecord(SQLModel):
    id: int
    name: str
    description: str | None


class ExpenseCategoryListData(SQLModel):
    list: list[ExpenseCategoryRecord]
    total: int


class ExpenseCategoryRequestPayload(SQLModel):
    name: str
    description: str | None = None


class ExpenseCategoryRequest(SQLModel):
    request_id: str
    ts: int
    payload: ExpenseCategoryRequestPayload


class ExpenseCategoryMessageData(SQLModel):
    message: str


class ApiSuccessBase(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int


class ExpenseCategoryListResponse(ApiSuccessBase):
    data: ExpenseCategoryListData


class ExpenseCategoryDetailResponse(ApiSuccessBase):
    data: ExpenseCategoryRecord


class ExpenseCategoryDeleteResponse(ApiSuccessBase):
    data: ExpenseCategoryMessageData
