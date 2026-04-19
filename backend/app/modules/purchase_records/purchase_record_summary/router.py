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


@router.post("/", response_model=schemas.PurchaseRecordSummaryDetailResponse, status_code=201)
def create_purchase_record_summary(
    payload: schemas.PurchaseRecordSummaryCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    return service.create_purchase_record_summary(
        session=session,
        current_user=current_user,
        payload=payload,
    )


@router.put("/{record_id}", response_model=schemas.PurchaseRecordSummaryDetailResponse)
def update_purchase_record_summary(
    record_id: uuid.UUID,
    payload: schemas.PurchaseRecordSummaryUpdate,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    return service.update_purchase_record_summary(
        session=session,
        current_user=current_user,
        record_id=record_id,
        payload=payload,
    )


@router.delete("/{record_id}", response_model=schemas.PurchaseRecordSummaryDeleteResponse)
def delete_purchase_record_summary(
    record_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.PurchaseRecordSummaryDeleteResponse:
    return service.delete_purchase_record_summary(
        session=session,
        current_user=current_user,
        record_id=record_id,
    )
