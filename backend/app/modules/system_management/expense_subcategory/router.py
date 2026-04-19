from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.modules.system_management.expense_subcategory import schemas, service

router = APIRouter(
    prefix="/system-management/expense-subcategory",
    tags=["expense-subcategory"],
)


@router.get("", response_model=schemas.ExpenseSubcategoryListResponse)
def list_expense_subcategory(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 20,
    major_category_id: int | None = None,
) -> schemas.ExpenseSubcategoryListResponse:
    return service.list_expense_subcategory(
        session=session,
        current_user=current_user,
        page=page,
        page_size=page_size,
        major_category_id=major_category_id,
    )


@router.get("/{subcategory_id}", response_model=schemas.ExpenseSubcategoryDetailResponse)
def get_expense_subcategory_detail(
    subcategory_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseSubcategoryDetailResponse:
    return service.get_expense_subcategory_detail(
        session=session,
        current_user=current_user,
        subcategory_id=subcategory_id,
    )


@router.post("", response_model=schemas.ExpenseSubcategoryDetailResponse, status_code=201)
def create_expense_subcategory(
    payload: schemas.ExpenseSubcategoryRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseSubcategoryDetailResponse:
    return service.create_expense_subcategory(
        session=session,
        current_user=current_user,
        payload=payload,
    )


@router.put("/{subcategory_id}", response_model=schemas.ExpenseSubcategoryDetailResponse)
def update_expense_subcategory(
    subcategory_id: int,
    payload: schemas.ExpenseSubcategoryRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseSubcategoryDetailResponse:
    return service.update_expense_subcategory(
        session=session,
        current_user=current_user,
        subcategory_id=subcategory_id,
        payload=payload,
    )


@router.delete("/{subcategory_id}", response_model=schemas.ExpenseSubcategoryDeleteResponse)
def delete_expense_subcategory(
    subcategory_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseSubcategoryDeleteResponse:
    return service.delete_expense_subcategory(
        session=session,
        current_user=current_user,
        subcategory_id=subcategory_id,
    )
