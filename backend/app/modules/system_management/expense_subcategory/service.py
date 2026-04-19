from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session

from app.models import User
from app.modules.system_management.expense_subcategory import repository, schemas
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory


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


def _to_record(item: ExpenseSubcategory, major_category_name: str) -> schemas.ExpenseSubcategoryRecord:
    return schemas.ExpenseSubcategoryRecord(
        id=item.id or 0,
        name=item.name,
        major_category_id=item.major_category_id,
        major_category_name=major_category_name,
        description=item.description,
    )


def list_expense_subcategory(
    *,
    session: Session,
    current_user: User,
    page: int,
    page_size: int,
    major_category_id: int | None,
) -> schemas.ExpenseSubcategoryListResponse:
    _require_superuser(current_user)
    items, total = repository.list_expense_subcategories(
        session=session,
        page=page,
        page_size=page_size,
        major_category_id=major_category_id,
    )
    categories = {
        item.id: item.name
        for item in [
            repository.get_expense_category_by_id(session=session, category_id=i.major_category_id)
            for i in items
        ]
        if item and item.id is not None
    }
    request_id = f"expense-subcategory-list-{current_user.id}"
    return schemas.ExpenseSubcategoryListResponse(
        request_id=request_id,
        ts=_now_ts(),
        data=schemas.ExpenseSubcategoryListData(
            list=[
                _to_record(item=item, major_category_name=categories.get(item.major_category_id, ""))
                for item in items
            ],
            total=total,
        ),
    )


def get_expense_subcategory_detail(
    *, session: Session, current_user: User, subcategory_id: int
) -> schemas.ExpenseSubcategoryDetailResponse:
    _require_superuser(current_user)
    request_id = f"expense-subcategory-detail-{subcategory_id}"
    item = repository.get_expense_subcategory_by_id(
        session=session,
        subcategory_id=subcategory_id,
    )
    if not item:
        _raise_error(
            status_code=404,
            code="EXPENSE_SUBCATEGORY_NOT_FOUND",
            message="Expense subcategory not found",
            request_id=request_id,
            details={"id": subcategory_id},
        )
    category = repository.get_expense_category_by_id(
        session=session,
        category_id=item.major_category_id,
    )
    return schemas.ExpenseSubcategoryDetailResponse(
        request_id=request_id,
        ts=_now_ts(),
        data=_to_record(item=item, major_category_name=category.name if category else ""),
    )


def create_expense_subcategory(
    *,
    session: Session,
    current_user: User,
    payload: schemas.ExpenseSubcategoryRequest,
) -> schemas.ExpenseSubcategoryDetailResponse:
    _require_superuser(current_user)
    exists = repository.get_expense_subcategory_by_name(session=session, name=payload.payload.name)
    if exists:
        _raise_error(
            status_code=422,
            code="EXPENSE_SUBCATEGORY_NAME_EXISTS",
            message="Expense subcategory name already exists",
            request_id=payload.request_id,
            details={"name": payload.payload.name},
        )

    category = repository.get_expense_category_by_id(
        session=session,
        category_id=payload.payload.major_category_id,
    )
    if not category:
        _raise_error(
            status_code=422,
            code="EXPENSE_CATEGORY_NOT_FOUND",
            message="major_category_id not found",
            request_id=payload.request_id,
            details={"major_category_id": payload.payload.major_category_id},
        )

    created = repository.create_expense_subcategory(
        session=session,
        subcategory=ExpenseSubcategory(
            name=payload.payload.name,
            major_category_id=payload.payload.major_category_id,
            description=payload.payload.description,
        ),
    )
    return schemas.ExpenseSubcategoryDetailResponse(
        request_id=payload.request_id,
        ts=payload.ts,
        data=_to_record(item=created, major_category_name=category.name),
    )


def update_expense_subcategory(
    *,
    session: Session,
    current_user: User,
    subcategory_id: int,
    payload: schemas.ExpenseSubcategoryRequest,
) -> schemas.ExpenseSubcategoryDetailResponse:
    _require_superuser(current_user)
    item = repository.get_expense_subcategory_by_id(
        session=session,
        subcategory_id=subcategory_id,
    )
    if not item:
        _raise_error(
            status_code=404,
            code="EXPENSE_SUBCATEGORY_NOT_FOUND",
            message="Expense subcategory not found",
            request_id=payload.request_id,
            details={"id": subcategory_id},
        )

    exists = repository.get_expense_subcategory_by_name(session=session, name=payload.payload.name)
    if exists and exists.id != item.id:
        _raise_error(
            status_code=422,
            code="EXPENSE_SUBCATEGORY_NAME_EXISTS",
            message="Expense subcategory name already exists",
            request_id=payload.request_id,
            details={"name": payload.payload.name},
        )

    category = repository.get_expense_category_by_id(
        session=session,
        category_id=payload.payload.major_category_id,
    )
    if not category:
        _raise_error(
            status_code=422,
            code="EXPENSE_CATEGORY_NOT_FOUND",
            message="major_category_id not found",
            request_id=payload.request_id,
            details={"major_category_id": payload.payload.major_category_id},
        )

    item.name = payload.payload.name
    item.major_category_id = payload.payload.major_category_id
    item.description = payload.payload.description
    updated = repository.update_expense_subcategory(session=session, subcategory=item)
    return schemas.ExpenseSubcategoryDetailResponse(
        request_id=payload.request_id,
        ts=payload.ts,
        data=_to_record(item=updated, major_category_name=category.name),
    )


def delete_expense_subcategory(
    *, session: Session, current_user: User, subcategory_id: int
) -> schemas.ExpenseSubcategoryDeleteResponse:
    _require_superuser(current_user)
    request_id = f"expense-subcategory-delete-{subcategory_id}"
    item = repository.get_expense_subcategory_by_id(
        session=session,
        subcategory_id=subcategory_id,
    )
    if not item:
        _raise_error(
            status_code=404,
            code="EXPENSE_SUBCATEGORY_NOT_FOUND",
            message="Expense subcategory not found",
            request_id=request_id,
            details={"id": subcategory_id},
        )

    purchase_count = repository.count_purchase_records_by_sub_category(
        session=session,
        subcategory_id=subcategory_id,
    )
    if purchase_count > 0:
        _raise_error(
            status_code=400,
            code="EXPENSE_SUBCATEGORY_HAS_PURCHASE_RECORDS",
            message="Expense subcategory has related purchase records",
            request_id=request_id,
            details={"purchase_records": purchase_count},
        )

    repository.delete_expense_subcategory(session=session, subcategory=item)
    return schemas.ExpenseSubcategoryDeleteResponse(
        request_id=request_id,
        ts=_now_ts(),
        data=schemas.ExpenseSubcategoryMessageData(message="Deleted"),
    )
