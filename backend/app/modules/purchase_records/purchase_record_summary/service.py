import uuid

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
        is_superuser=current_user.is_superuser,
        owner_id=current_user.id,
    )
    records = [_to_record(item) for item in items]
    return schemas.PurchaseRecordSummaryListResponse(
        data=schemas.PurchaseRecordSummaryListData(records=records)
    )


def get_purchase_record_summary_detail(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.PurchaseRecordSummaryDetailResponse:
    item = repository.get_purchase_record_by_id(session=session, record_id=record_id)
    if not item:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    if not current_user.is_superuser and item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return schemas.PurchaseRecordSummaryDetailResponse(data=_to_record(item))
