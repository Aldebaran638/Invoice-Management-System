import uuid
from datetime import date, datetime

from sqlmodel import Session, func, select

from app.models import User
from app.modules.purchase_records.models import (
    PurchaseCategory,
    PurchaseRecord,
    PurchaseSubcategory,
)


def list_records(
    *,
    session: Session,
    page: int,
    page_size: int,
    title: str | None,
    category_id: uuid.UUID | None,
    subcategory_id: uuid.UUID | None,
    purchase_date_start: date | None,
    purchase_date_end: date | None,
    owner_id: uuid.UUID | None,
) -> tuple[list[tuple[PurchaseRecord, str, str | None, User]], int]:
    conditions = [PurchaseRecord.is_deleted.is_(False)]
    if title:
        conditions.append(PurchaseRecord.title.ilike(f"%{title}%"))
    if category_id:
        conditions.append(PurchaseRecord.category_id == category_id)
    if subcategory_id:
        conditions.append(PurchaseRecord.subcategory_id == subcategory_id)
    if purchase_date_start:
        conditions.append(PurchaseRecord.purchase_date >= purchase_date_start)
    if purchase_date_end:
        conditions.append(PurchaseRecord.purchase_date <= purchase_date_end)
    if owner_id:
        conditions.append(PurchaseRecord.owner_id == owner_id)

    count_statement = (
        select(func.count())
        .select_from(PurchaseRecord)
        .where(*conditions)
    )
    total = session.exec(count_statement).one()

    statement = (
        select(PurchaseRecord, PurchaseCategory.name, PurchaseSubcategory.name, User)
        .join(PurchaseCategory, PurchaseCategory.id == PurchaseRecord.category_id)
        .join(User, User.id == PurchaseRecord.owner_id)
        .outerjoin(
            PurchaseSubcategory,
            PurchaseSubcategory.id == PurchaseRecord.subcategory_id,
        )
        .where(*conditions)
        .order_by(PurchaseRecord.purchase_date.desc(), PurchaseRecord.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return session.exec(statement).all(), total


def get_record_by_id(
    *, session: Session, record_id: uuid.UUID
) -> tuple[PurchaseRecord, str, str | None, User] | None:
    statement = (
        select(PurchaseRecord, PurchaseCategory.name, PurchaseSubcategory.name, User)
        .join(PurchaseCategory, PurchaseCategory.id == PurchaseRecord.category_id)
        .join(User, User.id == PurchaseRecord.owner_id)
        .outerjoin(
            PurchaseSubcategory,
            PurchaseSubcategory.id == PurchaseRecord.subcategory_id,
        )
        .where(PurchaseRecord.id == record_id)
    )
    return session.exec(statement).first()


def create_record(*, session: Session, record: PurchaseRecord) -> PurchaseRecord:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def update_record(*, session: Session, record: PurchaseRecord) -> PurchaseRecord:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def soft_delete_record(
    *, session: Session, record: PurchaseRecord, deleted_at: datetime
) -> PurchaseRecord:
    record.is_deleted = True
    record.deleted_at = deleted_at
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_category_by_id(
    *, session: Session, category_id: uuid.UUID
) -> PurchaseCategory | None:
    return session.get(PurchaseCategory, category_id)


def list_categories(
    *, session: Session, active_only: bool
) -> list[PurchaseCategory]:
    statement = select(PurchaseCategory).order_by(PurchaseCategory.name.asc())
    if active_only:
        statement = statement.where(PurchaseCategory.is_active.is_(True))
    return session.exec(statement).all()


def create_category(
    *, session: Session, category: PurchaseCategory
) -> PurchaseCategory:
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def update_category(
    *, session: Session, category: PurchaseCategory
) -> PurchaseCategory:
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def get_subcategory_by_id(
    *, session: Session, subcategory_id: uuid.UUID
) -> PurchaseSubcategory | None:
    return session.get(PurchaseSubcategory, subcategory_id)


def list_subcategories(
    *, session: Session, category_id: uuid.UUID | None, active_only: bool
) -> list[tuple[PurchaseSubcategory, str]]:
    statement = (
        select(PurchaseSubcategory, PurchaseCategory.name)
        .join(PurchaseCategory, PurchaseCategory.id == PurchaseSubcategory.category_id)
        .order_by(PurchaseSubcategory.name.asc())
    )
    if category_id:
        statement = statement.where(PurchaseSubcategory.category_id == category_id)
    if active_only:
        statement = statement.where(PurchaseSubcategory.is_active.is_(True))
    return session.exec(statement).all()


def create_subcategory(
    *, session: Session, subcategory: PurchaseSubcategory
) -> PurchaseSubcategory:
    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory


def update_subcategory(
    *, session: Session, subcategory: PurchaseSubcategory
) -> PurchaseSubcategory:
    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory
