import uuid
from datetime import datetime

from sqlmodel import Session, select

from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord


def list_purchase_records(
    *, session: Session, owner_id: uuid.UUID
) -> list[PurchaseRecord]:
    statement = (
        select(PurchaseRecord)
        .where(PurchaseRecord.owner_id == owner_id)
        .where(PurchaseRecord.is_deleted == False)  # noqa: E712
        .order_by(PurchaseRecord.purchase_date.desc())
    )
    return session.exec(statement).all()


def get_purchase_record_by_id_for_owner(
    *, session: Session, record_id: uuid.UUID, owner_id: uuid.UUID
) -> PurchaseRecord | None:
    statement = (
        select(PurchaseRecord)
        .where(PurchaseRecord.id == record_id)
        .where(PurchaseRecord.owner_id == owner_id)
        .where(PurchaseRecord.is_deleted == False)  # noqa: E712
    )
    return session.exec(statement).first()


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
