import uuid

from sqlmodel import Session, select

from app.modules.purchase_records.recycle_bin.models import PurchaseRecord


def list_deleted_purchase_records(*, session: Session, owner_id: uuid.UUID) -> list[PurchaseRecord]:
    statement = (
        select(PurchaseRecord)
        .where(PurchaseRecord.owner_id == owner_id)
        .where(PurchaseRecord.is_deleted == True)  # noqa: E712
        .order_by(PurchaseRecord.deleted_at.desc())
    )
    return session.exec(statement).all()


def get_deleted_purchase_record_by_id_for_owner(
    *, session: Session, record_id: uuid.UUID, owner_id: uuid.UUID
) -> PurchaseRecord | None:
    statement = (
        select(PurchaseRecord)
        .where(PurchaseRecord.id == record_id)
        .where(PurchaseRecord.owner_id == owner_id)
        .where(PurchaseRecord.is_deleted == True)  # noqa: E712
    )
    return session.exec(statement).first()


def restore_purchase_record(*, session: Session, record: PurchaseRecord) -> None:
    record.is_deleted = False
    record.deleted_at = None
    session.add(record)
    session.commit()
