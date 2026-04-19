from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session

from app.models import User
from app.modules.system_management.expense_category import repository, schemas
from app.modules.system_management.expense_category.models import ExpenseCategory


def _now_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _require_superuser(current_user: User) -> None:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")


def _raise_error(*, status_code: int, code: str, message: str, request_id: str, details: dict) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={
            "version": "1.0",
            "success": False,
            "code": code,
            "message": message,
            "request_id": request_id,
            "ts": _now_ts(),
            "error": {"details": details},
        },
    )


def _to_record(item: ExpenseCategory) -> schemas.ExpenseCategoryRecord:
    return schemas.ExpenseCategoryRecord(id=item.id or 0, name=item.name, description=item.description)


def list_expense_category(*, session: Session, current_user: User, page: int, page_size: int) -> schemas.ExpenseCategoryListResponse:
    _require_superuser(current_user)
    items, total = repository.list_expense_categories(session=session, page=page, page_size=page_size)
    request_id = f"expense-category-list-{current_user.id}"
    return schemas.ExpenseCategoryListResponse(
        request_id=request_id,
        ts=_now_ts(),
        data=schemas.ExpenseCategoryListData(list=[_to_record(item) for item in items], total=total),
    )


def get_expense_category_detail(*, session: Session, current_user: User, category_id: int) -> schemas.ExpenseCategoryDetailResponse:
    _require_superuser(current_user)
    request_id = f"expense-category-detail-{category_id}"
    item = repository.get_expense_category_by_id(session=session, category_id=category_id)
    if not item:
        _raise_error(
            status_code=404,
            code="EXPENSE_CATEGORY_NOT_FOUND",
            message="Expense category not found",
            request_id=request_id,
            details={"id": category_id},
        )
    return schemas.ExpenseCategoryDetailResponse(request_id=request_id, ts=_now_ts(), data=_to_record(item))


def create_expense_category(*, session: Session, current_user: User, payload: schemas.ExpenseCategoryRequest) -> schemas.ExpenseCategoryDetailResponse:
    _require_superuser(current_user)
    exists = repository.get_expense_category_by_name(session=session, name=payload.payload.name)
    if exists:
        _raise_error(
            status_code=422,
            code="EXPENSE_CATEGORY_NAME_EXISTS",
            message="Expense category name already exists",
            request_id=payload.request_id,
            details={"name": payload.payload.name},
        )

    created = repository.create_expense_category(
        session=session,
        category=ExpenseCategory(name=payload.payload.name, description=payload.payload.description),
    )
    return schemas.ExpenseCategoryDetailResponse(
        request_id=payload.request_id,
        ts=payload.ts,
        data=_to_record(created),
    )


def update_expense_category(
    *,
    session: Session,
    current_user: User,
    category_id: int,
    payload: schemas.ExpenseCategoryRequest,
) -> schemas.ExpenseCategoryDetailResponse:
    _require_superuser(current_user)
    item = repository.get_expense_category_by_id(session=session, category_id=category_id)
    if not item:
        _raise_error(
            status_code=404,
            code="EXPENSE_CATEGORY_NOT_FOUND",
            message="Expense category not found",
            request_id=payload.request_id,
            details={"id": category_id},
        )

    exists = repository.get_expense_category_by_name(session=session, name=payload.payload.name)
    if exists and exists.id != item.id:
        _raise_error(
            status_code=422,
            code="EXPENSE_CATEGORY_NAME_EXISTS",
            message="Expense category name already exists",
            request_id=payload.request_id,
            details={"name": payload.payload.name},
        )

    item.name = payload.payload.name
    item.description = payload.payload.description
    updated = repository.update_expense_category(session=session, category=item)
    return schemas.ExpenseCategoryDetailResponse(
        request_id=payload.request_id,
        ts=payload.ts,
        data=_to_record(updated),
    )


def delete_expense_category(
    *, session: Session, current_user: User, category_id: int
) -> schemas.ExpenseCategoryDeleteResponse:
    _require_superuser(current_user)
    request_id = f"expense-category-delete-{category_id}"
    item = repository.get_expense_category_by_id(session=session, category_id=category_id)
    if not item:
        _raise_error(
            status_code=404,
            code="EXPENSE_CATEGORY_NOT_FOUND",
            message="Expense category not found",
            request_id=request_id,
            details={"id": category_id},
        )

    purchase_count = repository.count_purchase_records_by_major_category(
        session=session,
        category_id=category_id,
    )
    subcategory_count = repository.count_subcategories_by_major_category(
        session=session,
        category_id=category_id,
    )
    if purchase_count > 0 or subcategory_count > 0:
        _raise_error(
            status_code=400,
            code="EXPENSE_CATEGORY_HAS_RELATIONS",
            message="Expense category has related records",
            request_id=request_id,
            details={"purchase_records": purchase_count, "subcategories": subcategory_count},
        )

    repository.delete_expense_category(session=session, category=item)
    return schemas.ExpenseCategoryDeleteResponse(
        request_id=request_id,
        ts=_now_ts(),
        data=schemas.ExpenseCategoryMessageData(message="Deleted"),
    )
