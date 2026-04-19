from sqlmodel import SQLModel


class ExpenseSubcategoryRecord(SQLModel):
    id: int
    name: str
    major_category_id: int
    major_category_name: str
    description: str | None


class ExpenseSubcategoryListData(SQLModel):
    list: list[ExpenseSubcategoryRecord]
    total: int


class ExpenseSubcategoryRequestPayload(SQLModel):
    name: str
    major_category_id: int
    description: str | None = None


class ExpenseSubcategoryRequest(SQLModel):
    request_id: str
    ts: int
    payload: ExpenseSubcategoryRequestPayload


class ExpenseSubcategoryMessageData(SQLModel):
    message: str


class ApiSuccessBase(SQLModel):
    version: str = "1.0"
    success: bool = True
    code: str = "OK"
    message: str = "success"
    request_id: str
    ts: int


class ExpenseSubcategoryListResponse(ApiSuccessBase):
    data: ExpenseSubcategoryListData


class ExpenseSubcategoryDetailResponse(ApiSuccessBase):
    data: ExpenseSubcategoryRecord


class ExpenseSubcategoryDeleteResponse(ApiSuccessBase):
    data: ExpenseSubcategoryMessageData
