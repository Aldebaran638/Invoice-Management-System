import uuid

from sqlmodel import Session, select

from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord


def list_purchase_records(
    *, session: Session, is_superuser: bool, owner_id: uuid.UUID
) -> list[PurchaseRecord]:
    statement = select(PurchaseRecord).order_by(PurchaseRecord.purchase_date.desc())
    if not is_superuser:
        statement = statement.where(PurchaseRecord.owner_id == owner_id)
    return session.exec(statement).all()


def get_purchase_record_by_id(
    *, session: Session, record_id: uuid.UUID
) -> PurchaseRecord | None:
    return session.get(PurchaseRecord, record_id)
