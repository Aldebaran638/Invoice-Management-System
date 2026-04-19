import uuid
from datetime import timezone, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlmodel import Session

from app.core.config import settings
from app.models import User
from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from app.modules.purchase_records.purchase_record_summary import repository, schemas

OTHER_PROJECT_CATEGORY_NAME = "其他项目费用"
MAX_UPLOAD_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


def _build_now_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _raise_error(
    *,
    status_code: int,
    code: str,
    message: str,
    request_id: str,
    details: dict,
) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={
            "version": "1.0",
            "success": False,
            "code": code,
            "message": message,
            "request_id": request_id,
            "ts": _build_now_ts(),
            "error": {"details": details},
        },
    )


def _raise_upload_error(*, message: str, details: dict) -> None:
    raise HTTPException(
        status_code=400,
        detail={
            "version": "1.0",
            "success": False,
            "code": "UPLOAD_IMAGE_INVALID",
            "message": message,
            "request_id": "purchase-record-summary-upload-image",
            "ts": _build_now_ts(),
            "error": {"details": details},
        },
    )


def _resolve_upload_root_dir() -> Path:
    upload_dir = Path(settings.UPLOAD_DIR)
    if upload_dir.is_absolute():
        return upload_dir
    project_root = Path(__file__).resolve().parents[5]
    return (project_root / upload_dir).resolve()


def _validate_category_rules(
    *,
    session: Session,
    major_category_id: int,
    sub_category_id: int | None,
    request_id: str,
) -> None:
    category = repository.get_expense_category_by_id(
        session=session,
        category_id=major_category_id,
    )
    if not category:
        _raise_error(
            status_code=422,
            code="MAJOR_CATEGORY_NOT_FOUND",
            message="major_category_id not found",
            request_id=request_id,
            details={"major_category_id": major_category_id},
        )

    if sub_category_id is None:
        return

    subcategory = repository.get_expense_subcategory_by_id(
        session=session,
        sub_category_id=sub_category_id,
    )
    if not subcategory:
        _raise_error(
            status_code=422,
            code="SUB_CATEGORY_NOT_FOUND",
            message="sub_category_id not found",
            request_id=request_id,
            details={"sub_category_id": sub_category_id},
        )

    if subcategory.major_category_id != major_category_id:
        _raise_error(
            status_code=422,
            code="SUB_CATEGORY_MAJOR_MISMATCH",
            message="sub_category_id does not belong to major_category_id",
            request_id=request_id,
            details={
                "sub_category_id": sub_category_id,
                "major_category_id": major_category_id,
            },
        )

    if category.name != OTHER_PROJECT_CATEGORY_NAME:
        _raise_error(
            status_code=422,
            code="INVALID_SUB_CATEGORY_USAGE",
            message='sub_category_id is allowed only when major category is "其他项目费用"',
            request_id=request_id,
            details={"major_category_id": major_category_id, "sub_category_id": sub_category_id},
        )


def _to_record(
    *,
    item: PurchaseRecord,
    category_name: str,
    sub_category_name: str | None,
) -> schemas.PurchaseRecordSummaryRecord:
    return schemas.PurchaseRecordSummaryRecord(
        id=item.id,
        purchase_date=item.purchase_date,
        name=item.name,
        amount=item.amount,
        founder_name=item.founder_name,
        major_category_id=item.major_category_id,
        major_category_name=category_name,
        sub_category_id=item.sub_category_id,
        sub_category_name=sub_category_name,
        purchase_image_url=item.purchase_image_url,
        remarks=item.remarks,
    )


def list_purchase_record_summary(
    *,
    session: Session,
    current_user: User,
    page: int,
    page_size: int,
    major_category_id: int | None,
    sub_category_id: int | None,
) -> schemas.PurchaseRecordSummaryListResponse:
    request_id = f"purchase-record-summary-list-{current_user.id}"
    items, total = repository.list_purchase_records(
        session=session,
        is_superuser=current_user.is_superuser,
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        major_category_id=major_category_id,
        sub_category_id=sub_category_id,
    )

    category_map = repository.list_expense_categories_by_ids(
        session=session,
        category_ids={item.major_category_id for item in items},
    )
    subcategory_map = repository.list_expense_subcategories_by_ids(
        session=session,
        subcategory_ids={item.sub_category_id for item in items if item.sub_category_id is not None},
    )

    records = [
        _to_record(
            item=item,
            category_name=category_map[item.major_category_id].name if item.major_category_id in category_map else "",
            sub_category_name=(
                subcategory_map[item.sub_category_id].name
                if item.sub_category_id is not None and item.sub_category_id in subcategory_map
                else None
            ),
        )
        for item in items
    ]
    return schemas.PurchaseRecordSummaryListResponse(
        request_id=request_id,
        ts=_build_now_ts(),
        data=schemas.PurchaseRecordSummaryListData(list=records, total=total),
    )


def get_purchase_record_summary_detail(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.PurchaseRecordSummaryDetailResponse:
    request_id = f"purchase-record-summary-detail-{record_id}"
    item = repository.get_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        is_superuser=current_user.is_superuser,
        owner_id=current_user.id,
    )
    if not item:
        _raise_error(
            status_code=404,
            code="PURCHASE_RECORD_NOT_FOUND",
            message="Purchase record not found",
            request_id=request_id,
            details={"record_id": str(record_id)},
        )

    category = repository.get_expense_category_by_id(
        session=session,
        category_id=item.major_category_id,
    )
    subcategory = None
    if item.sub_category_id is not None:
        subcategory = repository.get_expense_subcategory_by_id(
            session=session,
            sub_category_id=item.sub_category_id,
        )

    return schemas.PurchaseRecordSummaryDetailResponse(
        request_id=request_id,
        ts=_build_now_ts(),
        data=_to_record(
            item=item,
            category_name=category.name if category else "",
            sub_category_name=subcategory.name if subcategory else None,
        ),
    )


def create_purchase_record_summary(
    *,
    session: Session,
    current_user: User,
    payload: schemas.PurchaseRecordUpsertRequest,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    _validate_category_rules(
        session=session,
        major_category_id=payload.payload.major_category_id,
        sub_category_id=payload.payload.sub_category_id,
        request_id=payload.request_id,
    )

    item = PurchaseRecord(
        purchase_date=payload.payload.purchase_date,
        name=payload.payload.name,
        amount=payload.payload.amount,
        founder_name=payload.payload.founder_name,
        major_category_id=payload.payload.major_category_id,
        sub_category_id=payload.payload.sub_category_id,
        purchase_image_url=payload.payload.purchase_image_url,
        remarks=payload.payload.remarks,
        owner_id=current_user.id,
        is_deleted=False,
        deleted_at=None,
    )
    created = repository.create_purchase_record(session=session, record=item)

    category = repository.get_expense_category_by_id(
        session=session,
        category_id=created.major_category_id,
    )
    subcategory = None
    if created.sub_category_id is not None:
        subcategory = repository.get_expense_subcategory_by_id(
            session=session,
            sub_category_id=created.sub_category_id,
        )
    return schemas.PurchaseRecordSummaryDetailResponse(
        request_id=payload.request_id,
        ts=payload.ts,
        data=_to_record(
            item=created,
            category_name=category.name if category else "",
            sub_category_name=subcategory.name if subcategory else None,
        ),
    )


def update_purchase_record_summary(
    *,
    session: Session,
    current_user: User,
    record_id: uuid.UUID,
    payload: schemas.PurchaseRecordUpsertRequest,
) -> schemas.PurchaseRecordSummaryDetailResponse:
    _validate_category_rules(
        session=session,
        major_category_id=payload.payload.major_category_id,
        sub_category_id=payload.payload.sub_category_id,
        request_id=payload.request_id,
    )

    item = repository.get_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        is_superuser=current_user.is_superuser,
        owner_id=current_user.id,
    )
    if not item:
        _raise_error(
            status_code=404,
            code="PURCHASE_RECORD_NOT_FOUND",
            message="Purchase record not found",
            request_id=payload.request_id,
            details={"record_id": str(record_id)},
        )

    item.purchase_date = payload.payload.purchase_date
    item.name = payload.payload.name
    item.amount = payload.payload.amount
    item.founder_name = payload.payload.founder_name
    item.major_category_id = payload.payload.major_category_id
    item.sub_category_id = payload.payload.sub_category_id
    item.purchase_image_url = payload.payload.purchase_image_url
    item.remarks = payload.payload.remarks
    updated = repository.update_purchase_record(session=session, record=item)

    category = repository.get_expense_category_by_id(
        session=session,
        category_id=updated.major_category_id,
    )
    subcategory = None
    if updated.sub_category_id is not None:
        subcategory = repository.get_expense_subcategory_by_id(
            session=session,
            sub_category_id=updated.sub_category_id,
        )
    return schemas.PurchaseRecordSummaryDetailResponse(
        request_id=payload.request_id,
        ts=payload.ts,
        data=_to_record(
            item=updated,
            category_name=category.name if category else "",
            sub_category_name=subcategory.name if subcategory else None,
        ),
    )


def delete_purchase_record_summary(
    *, session: Session, current_user: User, record_id: uuid.UUID
) -> schemas.PurchaseRecordSummaryDeleteResponse:
    request_id = f"purchase-record-summary-delete-{record_id}"
    item = repository.get_purchase_record_by_id_for_owner(
        session=session,
        record_id=record_id,
        is_superuser=current_user.is_superuser,
        owner_id=current_user.id,
    )
    if not item:
        _raise_error(
            status_code=404,
            code="PURCHASE_RECORD_NOT_FOUND",
            message="Purchase record not found",
            request_id=request_id,
            details={"record_id": str(record_id)},
        )

    repository.soft_delete_purchase_record(
        session=session,
        record=item,
        deleted_at=datetime.now(timezone.utc),
    )
    return schemas.PurchaseRecordSummaryDeleteResponse(
        request_id=request_id,
        ts=_build_now_ts(),
        data=schemas.PurchaseRecordDeleteData(message="Deleted"),
    )


async def upload_purchase_record_image(*, current_user: User, file: UploadFile) -> dict[str, str]:
    _ = current_user

    original_name = file.filename or ""
    ext = Path(original_name).suffix.lower().lstrip(".")
    content_type = (file.content_type or "").lower()

    if ext not in ALLOWED_EXTENSIONS:
        _raise_upload_error(
            message="Invalid file extension",
            details={
                "reason": "format_not_allowed",
                "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
            },
        )

    if content_type not in ALLOWED_CONTENT_TYPES:
        _raise_upload_error(
            message="Invalid content type",
            details={
                "reason": "content_type_not_allowed",
                "allowed_content_types": sorted(ALLOWED_CONTENT_TYPES),
            },
        )

    content = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        _raise_upload_error(
            message="File size exceeds 5MB",
            details={"reason": "size_exceeded", "max_size": MAX_UPLOAD_SIZE},
        )

    upload_dir = _resolve_upload_root_dir() / "purchase_record"
    upload_dir.mkdir(parents=True, exist_ok=True)

    new_file_name = f"{uuid.uuid4()}.{ext}"
    target_file = upload_dir / new_file_name
    target_file.write_bytes(content)

    return {"url": f"/uploads/purchase_record/{new_file_name}"}
