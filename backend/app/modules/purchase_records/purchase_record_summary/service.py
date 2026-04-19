import uuid
from datetime import timezone, datetime

from fastapi import HTTPException
from sqlmodel import Session

from app.models import User
from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from app.modules.purchase_records.purchase_record_summary import repository, schemas


def _to_record(item: PurchaseRecord) -> schemas.PurchaseRecordSummaryRecord:
    return schemas.PurchaseRecordSummaryRecord(
        id=item.id,
        purchase_date=item.purchase_date,
        name=item.name,
        amount=item.amount,
    )


def list_purchase_record_summary(
    *, session: Session, current_user: User
) -> schemas.PurchaseRecordSummaryListResponse:
    items = repository.list_purchase_records(
        session=session,
        owner_id=current_user.id,
    )
    records = [_to_record(item) for item in items]
    return schemas.PurchaseRecordSummaryListResponse(
        data=schemas.PurchaseRecordSummaryListData(records=records)
    )


def get_purchase_record_summary_detail(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.PurchaseRecordSummaryDetailResponse:
    item = repository.get_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        owner_id=current_user.id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    return schemas.PurchaseRecordSummaryDetailResponse(data=_to_record(item))


def create_purchase_record_summary(
    *,
    session: Session,
    current_user: User,
    payload: schemas.PurchaseRecordSummaryCreate,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    item = PurchaseRecord(
        purchase_date=payload.purchase_date,
        name=payload.name,
        amount=payload.amount,
        owner_id=current_user.id,
        is_deleted=False,
        deleted_at=None,
    )
    created = repository.create_purchase_record(session=session, record=item)
    return schemas.PurchaseRecordSummaryDetailResponse(data=_to_record(created))


def update_purchase_record_summary(
    *,
    session: Session,
    current_user: User,
    record_id: uuid.UUID,
    payload: schemas.PurchaseRecordSummaryUpdate,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    item = repository.get_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        owner_id=current_user.id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    item.purchase_date = payload.purchase_date
    item.name = payload.name
    item.amount = payload.amount
    updated = repository.update_purchase_record(session=session, record=item)
    return schemas.PurchaseRecordSummaryDetailResponse(data=_to_record(updated))


def delete_purchase_record_summary(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.PurchaseRecordSummaryDeleteResponse:
    item = repository.get_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        owner_id=current_user.id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    repository.soft_delete_purchase_record(
        session=session,
        record=item,
        deleted_at=datetime.now(timezone.utc),
    )
    return schemas.PurchaseRecordSummaryDeleteResponse(message="Deleted")
