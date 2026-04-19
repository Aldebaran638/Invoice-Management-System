from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.modules.system_management.expense_category import schemas, service

router = APIRouter(prefix="/system-management/expense-category", tags=["expense-category"])


@router.get("", response_model=schemas.ExpenseCategoryListResponse)
def list_expense_category(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 20,
) -> schemas.ExpenseCategoryListResponse:
    return service.list_expense_category(
        session=session,
        current_user=current_user,
        page=page,
        page_size=page_size,
    )


@router.get("/{category_id}", response_model=schemas.ExpenseCategoryDetailResponse)
def get_expense_category_detail(
    category_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseCategoryDetailResponse:
    return service.get_expense_category_detail(
        session=session,
        current_user=current_user,
        category_id=category_id,
    )


@router.post("", response_model=schemas.ExpenseCategoryDetailResponse, status_code=201)
def create_expense_category(
    payload: schemas.ExpenseCategoryRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseCategoryDetailResponse:
    return service.create_expense_category(
        session=session,
        current_user=current_user,
        payload=payload,
    )


@router.put("/{category_id}", response_model=schemas.ExpenseCategoryDetailResponse)
def update_expense_category(
    category_id: int,
    payload: schemas.ExpenseCategoryRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseCategoryDetailResponse:
    return service.update_expense_category(
        session=session,
        current_user=current_user,
        category_id=category_id,
        payload=payload,
    )


@router.delete("/{category_id}", response_model=schemas.ExpenseCategoryDeleteResponse)
def delete_expense_category(
    category_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.ExpenseCategoryDeleteResponse:
    return service.delete_expense_category(
        session=session,
        current_user=current_user,
        category_id=category_id,
    )
