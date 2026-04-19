import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.modules.purchase_records.purchase_record_summary import schemas, service

router = APIRouter(
    prefix="/purchase-records/purchase-record-summary",
    tags=["purchase-record-summary"],
)


@router.get("/", response_model=schemas.PurchaseRecordSummaryListResponse)
def list_purchase_record_summary(
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.PurchaseRecordSummaryListResponse:
    return service.list_purchase_record_summary(
        session=session,
        current_user=current_user,
    )


@router.get("/{record_id}", response_model=schemas.PurchaseRecordSummaryDetailResponse)
def get_purchase_record_summary_detail(
    record_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    return service.get_purchase_record_summary_detail(
        session=session,
        current_user=current_user,
        record_id=record_id,
    )
