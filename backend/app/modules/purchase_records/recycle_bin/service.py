import uuid

from fastapi import HTTPException
from sqlmodel import Session

from app.models import User
from app.modules.purchase_records.recycle_bin import repository, schemas
from app.modules.purchase_records.recycle_bin.models import PurchaseRecord


def _to_record(item: PurchaseRecord) -> schemas.RecycleBinRecord:
    return schemas.RecycleBinRecord(
        id=item.id,
        purchase_date=item.purchase_date,
        name=item.name,
        amount=item.amount,
        deleted_at=item.deleted_at,
    )


def list_recycle_bin(*, session: Session, current_user: User) -> schemas.RecycleBinListResponse:
    records = repository.list_deleted_purchase_records(
        session=session,
        owner_id=current_user.id,
    )
    return schemas.RecycleBinListResponse(
        data=schemas.RecycleBinListData(records=[_to_record(item) for item in records])
    )


def get_recycle_bin_detail(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.RecycleBinDetailResponse:
    record = repository.get_deleted_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        owner_id=current_user.id,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    return schemas.RecycleBinDetailResponse(data=_to_record(record))


def restore_recycle_bin_record(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.RecycleBinRestoreResponse:
    record = repository.get_deleted_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        owner_id=current_user.id,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    repository.restore_purchase_record(session=session, record=record)
    return schemas.RecycleBinRestoreResponse(message="Restored")
