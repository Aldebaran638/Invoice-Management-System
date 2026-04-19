import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.modules.purchase_records.recycle_bin import schemas, service

router = APIRouter(prefix="/purchase_records/recycle_bin", tags=["recycle-bin"])


@router.get("", response_model=schemas.RecycleBinListResponse)
def list_recycle_bin(
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.RecycleBinListResponse:
    return service.list_recycle_bin(session=session, current_user=current_user)


@router.get("/{record_id}", response_model=schemas.RecycleBinDetailResponse)
def get_recycle_bin_detail(
    record_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.RecycleBinDetailResponse:
    return service.get_recycle_bin_detail(
        session=session,
        current_user=current_user,
        record_id=record_id,
    )


@router.post("/{record_id}/restore", response_model=schemas.RecycleBinRestoreResponse)
def restore_recycle_bin_record(
    record_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> schemas.RecycleBinRestoreResponse:
    return service.restore_recycle_bin_record(
        session=session,
        current_user=current_user,
        record_id=record_id,
    )
