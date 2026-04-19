import uuid
from datetime import datetime

from sqlalchemy import func
from sqlmodel import Session, select

from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from app.modules.system_management.expense_category.models import ExpenseCategory
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory


def list_purchase_records(
    *,
    session: Session,
    is_superuser: bool,
    owner_id: uuid.UUID,
    page: int,
    page_size: int,
    major_category_id: int | None,
    sub_category_id: int | None,
) -> tuple[list[PurchaseRecord], int]:
    base_statement = select(PurchaseRecord).where(PurchaseRecord.is_deleted == False)  # noqa: E712
    if not is_superuser:
        base_statement = base_statement.where(PurchaseRecord.owner_id == owner_id)
    if major_category_id is not None:
        base_statement = base_statement.where(
            PurchaseRecord.major_category_id == major_category_id
        )
    if sub_category_id is not None:
        base_statement = base_statement.where(PurchaseRecord.sub_category_id == sub_category_id)

    count_statement = select(func.count()).select_from(base_statement.subquery())
    total = session.exec(count_statement).one()

    statement = (
        base_statement.order_by(PurchaseRecord.purchase_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return session.exec(statement).all(), total


def get_purchase_record_by_id_for_owner(
    *,
    session: Session,
    record_id: uuid.UUID,
    is_superuser: bool,
    owner_id: uuid.UUID,
) -> PurchaseRecord | None:
    statement = (
        select(PurchaseRecord)
        .where(PurchaseRecord.id == record_id)
        .where(PurchaseRecord.is_deleted == False)  # noqa: E712
    )
    if not is_superuser:
        statement = statement.where(PurchaseRecord.owner_id == owner_id)
    return session.exec(statement).first()


def get_expense_category_by_id(*, session: Session, category_id: int) -> ExpenseCategory | None:
    return session.get(ExpenseCategory, category_id)


def get_expense_subcategory_by_id(
    *, session: Session, sub_category_id: int
) -> ExpenseSubcategory | None:
    return session.get(ExpenseSubcategory, sub_category_id)


def list_expense_categories_by_ids(
    *, session: Session, category_ids: set[int]
) -> dict[int, ExpenseCategory]:
    if not category_ids:
        return {}
    statement = select(ExpenseCategory).where(ExpenseCategory.id.in_(category_ids))
    return {item.id: item for item in session.exec(statement).all() if item.id is not None}


def list_expense_subcategories_by_ids(
    *, session: Session, subcategory_ids: set[int]
) -> dict[int, ExpenseSubcategory]:
    if not subcategory_ids:
        return {}
    statement = select(ExpenseSubcategory).where(ExpenseSubcategory.id.in_(subcategory_ids))
    return {item.id: item for item in session.exec(statement).all() if item.id is not None}


def create_purchase_record(*, session: Session, record: PurchaseRecord) -> PurchaseRecord:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def update_purchase_record(*, session: Session, record: PurchaseRecord) -> PurchaseRecord:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def soft_delete_purchase_record(
    *, session: Session, record: PurchaseRecord, deleted_at: datetime
) -> None:
    record.is_deleted = True
    record.deleted_at = deleted_at
    session.add(record)
    session.commit()
