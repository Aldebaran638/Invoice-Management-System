import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from pydantic import ValidationError
from sqlmodel import Session

from app.models import User
from app.modules.purchase_records import repository, schemas
from app.modules.purchase_records.models import (
    PurchaseCategory,
    PurchaseRecord,
    PurchaseSubcategory,
)

OTHER_EXPENSE_CATEGORY_NAME = "其他费用"
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20


class PurchaseRecordsServiceError(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        request_id: str,
        details: dict[str, str] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.request_id = request_id
        self.details = details or {}
        super().__init__(message)


def current_timestamp_ms() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def ensure_request_id(request_id: str | None) -> str:
    return request_id or f"req-{uuid.uuid4()}"


def build_error_response(error: PurchaseRecordsServiceError) -> schemas.ErrorResponse:
    return schemas.ErrorResponse(
        code=error.code,
        message=error.message,
        request_id=error.request_id,
        ts=current_timestamp_ms(),
        error=schemas.ErrorBody(details=error.details),
    )


def parse_bool_field(
    *, value: str | bool | None, field_name: str, request_id: str
) -> bool:
    if value is None:
        return True
    if isinstance(value, bool):
        return value
    lowered = value.strip().lower()
    if lowered in {"true", "1", "yes"}:
        return True
    if lowered in {"false", "0", "no"}:
        return False
    raise PurchaseRecordsServiceError(
        status_code=400,
        code="INVALID_ARGUMENT",
        message=f"invalid field: {field_name}",
        request_id=request_id,
        details={field_name: "invalid boolean value"},
    )


def parse_int_field(
    *, value: str | int | None, field_name: str, request_id: str, default: int
) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message=f"invalid field: {field_name}",
            request_id=request_id,
            details={field_name: "invalid integer value"},
        )
    if parsed < 1:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message=f"invalid field: {field_name}",
            request_id=request_id,
            details={field_name: "must be greater than 0"},
        )
    return parsed


def parse_uuid_field(
    *, value: str | uuid.UUID | None, field_name: str, request_id: str
) -> uuid.UUID | None:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message=f"invalid field: {field_name}",
            request_id=request_id,
            details={field_name: "invalid uuid"},
        )


def parse_date_field(
    *, value: str | None, field_name: str, request_id: str
):
    if value is None:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message=f"invalid field: {field_name}",
            request_id=request_id,
            details={field_name: "invalid date, expected YYYY-MM-DD"},
        )


def ensure_admin(current_user: User, request_id: str) -> None:
    if not current_user.is_superuser:
        raise PurchaseRecordsServiceError(
            status_code=403,
            code="FORBIDDEN",
            message="not enough permissions",
            request_id=request_id,
        )


def owner_name_for(user: User) -> str:
    return user.full_name or user.email


def map_validation_error(exc: ValidationError) -> dict[str, str]:
    details: dict[str, str] = {}
    for error in exc.errors():
        field_name = str(error["loc"][-1])
        details[field_name] = error["msg"]
    return details


def validate_record_payload(
    *, payload: dict[str, object], request_id: str
) -> schemas.PurchaseRecordPayload:
    try:
        record_payload = schemas.PurchaseRecordPayload.model_validate(payload)
    except ValidationError as exc:
        details = map_validation_error(exc)
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid purchase record payload",
            request_id=request_id,
            details=details,
        )

    try:
        amount = Decimal(record_payload.amount)
    except (TypeError, InvalidOperation):
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: amount",
            request_id=request_id,
            details={"amount": "invalid decimal value"},
        )

    if amount < Decimal("0"):
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: amount",
            request_id=request_id,
            details={"amount": "must be greater than or equal to 0"},
        )
    if amount != amount.quantize(Decimal("0.01")):
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: amount",
            request_id=request_id,
            details={"amount": "must keep two decimal places"},
        )

    record_payload.amount = amount.quantize(Decimal("0.01"))
    return record_payload


def validate_category_payload(
    *, payload: dict[str, object], request_id: str
) -> schemas.PurchaseCategoryPayload:
    try:
        category_payload = schemas.PurchaseCategoryPayload.model_validate(payload)
    except ValidationError as exc:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid category payload",
            request_id=request_id,
            details=map_validation_error(exc),
        )
    return category_payload


def validate_subcategory_payload(
    *, payload: dict[str, object], request_id: str
) -> schemas.PurchaseSubcategoryPayload:
    try:
        subcategory_payload = schemas.PurchaseSubcategoryPayload.model_validate(payload)
    except ValidationError as exc:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid subcategory payload",
            request_id=request_id,
            details=map_validation_error(exc),
        )
    return subcategory_payload


def build_record_item(
    record: PurchaseRecord,
    category_name: str,
    subcategory_name: str | None,
    owner: User,
) -> schemas.PurchaseRecordItem:
    return schemas.PurchaseRecordItem(
        id=record.id,
        title=record.title,
        remark=record.remark,
        amount=record.amount,
        purchase_date=record.purchase_date,
        category_id=record.category_id,
        category_name=category_name,
        subcategory_id=record.subcategory_id,
        subcategory_name=subcategory_name,
        owner_id=record.owner_id,
        owner_name=owner_name_for(owner),
    )


def build_category_item(category: PurchaseCategory) -> schemas.PurchaseCategoryItem:
    return schemas.PurchaseCategoryItem(
        id=category.id,
        name=category.name,
        is_active=category.is_active,
    )


def build_subcategory_item(
    subcategory: PurchaseSubcategory, category_name: str
) -> schemas.PurchaseSubcategoryItem:
    return schemas.PurchaseSubcategoryItem(
        id=subcategory.id,
        category_id=subcategory.category_id,
        category_name=category_name,
        name=subcategory.name,
        is_active=subcategory.is_active,
    )


def ensure_record_access(
    *, record: PurchaseRecord, current_user: User, request_id: str
) -> None:
    if record.is_deleted:
        raise PurchaseRecordsServiceError(
            status_code=404,
            code="NOT_FOUND",
            message="purchase record not found",
            request_id=request_id,
            details={"record_id": "not found"},
        )
    if not current_user.is_superuser and record.owner_id != current_user.id:
        raise PurchaseRecordsServiceError(
            status_code=403,
            code="FORBIDDEN",
            message="not enough permissions",
            request_id=request_id,
        )


def validate_record_business_rules(
    *,
    session: Session,
    payload: schemas.PurchaseRecordPayload,
    request_id: str,
) -> tuple[PurchaseCategory, PurchaseSubcategory | None]:
    category = repository.get_category_by_id(session=session, category_id=payload.category_id)
    if not category:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: category_id",
            request_id=request_id,
            details={"category_id": "category not found"},
        )

    subcategory: PurchaseSubcategory | None = None
    if payload.subcategory_id is not None:
        subcategory = repository.get_subcategory_by_id(
            session=session, subcategory_id=payload.subcategory_id
        )
        if not subcategory:
            raise PurchaseRecordsServiceError(
                status_code=400,
                code="INVALID_ARGUMENT",
                message="invalid field: subcategory_id",
                request_id=request_id,
                details={"subcategory_id": "subcategory not found"},
            )

    if category.name != OTHER_EXPENSE_CATEGORY_NAME and payload.subcategory_id is not None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: subcategory_id",
            request_id=request_id,
            details={"subcategory_id": "must be empty when category is not 其他费用"},
        )

    if category.name == OTHER_EXPENSE_CATEGORY_NAME and payload.subcategory_id is None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: subcategory_id",
            request_id=request_id,
            details={"subcategory_id": "is required when category is 其他费用"},
        )

    if subcategory and subcategory.category_id != category.id:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: subcategory_id",
            request_id=request_id,
            details={"subcategory_id": "subcategory does not belong to category"},
        )

    return category, subcategory


def list_records(
    *,
    session: Session,
    current_user: User,
    page: str | int | None,
    page_size: str | int | None,
    title: str | None,
    category_id: str | None,
    subcategory_id: str | None,
    purchase_date_start: str | None,
    purchase_date_end: str | None,
    owner_id: str | None,
) -> schemas.PurchaseRecordListResponse:
    request_id = ensure_request_id(None)
    parsed_page = parse_int_field(
        value=page, field_name="page", request_id=request_id, default=DEFAULT_PAGE
    )
    parsed_page_size = parse_int_field(
        value=page_size,
        field_name="page_size",
        request_id=request_id,
        default=DEFAULT_PAGE_SIZE,
    )
    parsed_category_id = parse_uuid_field(
        value=category_id, field_name="category_id", request_id=request_id
    )
    parsed_subcategory_id = parse_uuid_field(
        value=subcategory_id, field_name="subcategory_id", request_id=request_id
    )
    parsed_owner_id = parse_uuid_field(
        value=owner_id, field_name="owner_id", request_id=request_id
    )
    parsed_purchase_date_start = parse_date_field(
        value=purchase_date_start,
        field_name="purchase_date_start",
        request_id=request_id,
    )
    parsed_purchase_date_end = parse_date_field(
        value=purchase_date_end,
        field_name="purchase_date_end",
        request_id=request_id,
    )
    if parsed_purchase_date_start and parsed_purchase_date_end:
        if parsed_purchase_date_start > parsed_purchase_date_end:
            raise PurchaseRecordsServiceError(
                status_code=400,
                code="INVALID_ARGUMENT",
                message="invalid field: purchase_date_start",
                request_id=request_id,
                details={"purchase_date_start": "must be less than or equal to purchase_date_end"},
            )

    effective_owner_id = current_user.id
    if current_user.is_superuser:
        effective_owner_id = parsed_owner_id
    elif parsed_owner_id is not None and parsed_owner_id != current_user.id:
        raise PurchaseRecordsServiceError(
            status_code=403,
            code="FORBIDDEN",
            message="not enough permissions",
            request_id=request_id,
        )

    rows, total = repository.list_records(
        session=session,
        page=parsed_page,
        page_size=parsed_page_size,
        title=title,
        category_id=parsed_category_id,
        subcategory_id=parsed_subcategory_id,
        purchase_date_start=parsed_purchase_date_start,
        purchase_date_end=parsed_purchase_date_end,
        owner_id=effective_owner_id,
    )
    records = [
        build_record_item(record, category_name, subcategory_name, owner)
        for record, category_name, subcategory_name, owner in rows
    ]
    return schemas.PurchaseRecordListResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=schemas.PurchaseRecordListData(records=records, total=total),
    )


def get_record_detail(
    *, session: Session, current_user: User, record_id: str
) -> schemas.PurchaseRecordDetailResponse:
    request_id = ensure_request_id(None)
    parsed_record_id = parse_uuid_field(
        value=record_id, field_name="record_id", request_id=request_id
    )
    if parsed_record_id is None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: record_id",
            request_id=request_id,
            details={"record_id": "record_id is required"},
        )
    row = repository.get_record_by_id(session=session, record_id=parsed_record_id)
    if not row:
        raise PurchaseRecordsServiceError(
            status_code=404,
            code="NOT_FOUND",
            message="purchase record not found",
            request_id=request_id,
            details={"record_id": "not found"},
        )
    record, category_name, subcategory_name, owner = row
    ensure_record_access(record=record, current_user=current_user, request_id=request_id)
    return schemas.PurchaseRecordDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_record_item(record, category_name, subcategory_name, owner),
    )


def create_record(
    *, session: Session, current_user: User, body: schemas.RequestEnvelope
) -> schemas.PurchaseRecordDetailResponse:
    request_id = ensure_request_id(body.request_id)
    payload = validate_record_payload(payload=body.payload, request_id=request_id)
    validate_record_business_rules(
        session=session,
        payload=payload,
        request_id=request_id,
    )
    record = PurchaseRecord(
        title=payload.title,
        remark=payload.remark,
        amount=payload.amount,
        purchase_date=payload.purchase_date,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        owner_id=current_user.id,
    )
    repository.create_record(session=session, record=record)
    row = repository.get_record_by_id(session=session, record_id=record.id)
    if row is None:
        raise PurchaseRecordsServiceError(
            status_code=500,
            code="INTERNAL_ERROR",
            message="failed to load purchase record",
            request_id=request_id,
        )
    created_record, category_name, subcategory_name, owner = row
    return schemas.PurchaseRecordDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_record_item(created_record, category_name, subcategory_name, owner),
    )


def update_record(
    *,
    session: Session,
    current_user: User,
    record_id: str,
    body: schemas.RequestEnvelope,
) -> schemas.PurchaseRecordDetailResponse:
    request_id = ensure_request_id(body.request_id)
    parsed_record_id = parse_uuid_field(
        value=record_id, field_name="record_id", request_id=request_id
    )
    if parsed_record_id is None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: record_id",
            request_id=request_id,
            details={"record_id": "record_id is required"},
        )
    row = repository.get_record_by_id(session=session, record_id=parsed_record_id)
    if not row:
        raise PurchaseRecordsServiceError(
            status_code=404,
            code="NOT_FOUND",
            message="purchase record not found",
            request_id=request_id,
            details={"record_id": "not found"},
        )
    record, _, _, _ = row
    ensure_record_access(record=record, current_user=current_user, request_id=request_id)
    payload = validate_record_payload(payload=body.payload, request_id=request_id)
    validate_record_business_rules(
        session=session,
        payload=payload,
        request_id=request_id,
    )
    record.title = payload.title
    record.remark = payload.remark
    record.amount = payload.amount
    record.purchase_date = payload.purchase_date
    record.category_id = payload.category_id
    record.subcategory_id = payload.subcategory_id
    repository.update_record(session=session, record=record)
    refreshed_row = repository.get_record_by_id(session=session, record_id=record.id)
    if refreshed_row is None:
        raise PurchaseRecordsServiceError(
            status_code=500,
            code="INTERNAL_ERROR",
            message="failed to load purchase record",
            request_id=request_id,
        )
    refreshed_record, category_name, subcategory_name, owner = refreshed_row
    return schemas.PurchaseRecordDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_record_item(refreshed_record, category_name, subcategory_name, owner),
    )


def delete_record(
    *, session: Session, current_user: User, record_id: str
) -> schemas.PurchaseRecordDeleteResponse:
    request_id = ensure_request_id(None)
    parsed_record_id = parse_uuid_field(
        value=record_id, field_name="record_id", request_id=request_id
    )
    if parsed_record_id is None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: record_id",
            request_id=request_id,
            details={"record_id": "record_id is required"},
        )
    row = repository.get_record_by_id(session=session, record_id=parsed_record_id)
    if not row:
        raise PurchaseRecordsServiceError(
            status_code=404,
            code="NOT_FOUND",
            message="purchase record not found",
            request_id=request_id,
            details={"record_id": "not found"},
        )
    record, _, _, _ = row
    ensure_record_access(record=record, current_user=current_user, request_id=request_id)
    deleted_at = datetime.now(tz=timezone.utc)
    repository.soft_delete_record(session=session, record=record, deleted_at=deleted_at)
    return schemas.PurchaseRecordDeleteResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=schemas.PurchaseRecordDeleteData(
            id=record.id,
            is_deleted=record.is_deleted,
            deleted_at=record.deleted_at.isoformat() if record.deleted_at else None,
        ),
    )


def list_categories(
    *, session: Session, current_user: User, active_only: str | bool | None
) -> schemas.PurchaseCategoryListResponse:
    request_id = ensure_request_id(None)
    parsed_active_only = parse_bool_field(
        value=active_only, field_name="active_only", request_id=request_id
    )
    effective_active_only = parsed_active_only or not current_user.is_superuser
    categories = repository.list_categories(
        session=session,
        active_only=effective_active_only,
    )
    return schemas.PurchaseCategoryListResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=schemas.PurchaseCategoryListData(
            categories=[build_category_item(category) for category in categories]
        ),
    )


def create_category(
    *, session: Session, current_user: User, body: schemas.RequestEnvelope
) -> schemas.PurchaseCategoryDetailResponse:
    request_id = ensure_request_id(body.request_id)
    ensure_admin(current_user, request_id)
    payload = validate_category_payload(payload=body.payload, request_id=request_id)
    category = PurchaseCategory(name=payload.name, is_active=payload.is_active)
    repository.create_category(session=session, category=category)
    return schemas.PurchaseCategoryDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_category_item(category),
    )


def update_category(
    *,
    session: Session,
    current_user: User,
    category_id: str,
    body: schemas.RequestEnvelope,
) -> schemas.PurchaseCategoryDetailResponse:
    request_id = ensure_request_id(body.request_id)
    ensure_admin(current_user, request_id)
    parsed_category_id = parse_uuid_field(
        value=category_id, field_name="category_id", request_id=request_id
    )
    if parsed_category_id is None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: category_id",
            request_id=request_id,
            details={"category_id": "category_id is required"},
        )
    category = repository.get_category_by_id(session=session, category_id=parsed_category_id)
    if not category:
        raise PurchaseRecordsServiceError(
            status_code=404,
            code="NOT_FOUND",
            message="purchase category not found",
            request_id=request_id,
            details={"category_id": "not found"},
        )
    payload = validate_category_payload(payload=body.payload, request_id=request_id)
    category.name = payload.name
    category.is_active = payload.is_active
    repository.update_category(session=session, category=category)
    return schemas.PurchaseCategoryDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_category_item(category),
    )


def list_subcategories(
    *,
    session: Session,
    current_user: User,
    category_id: str | None,
    active_only: str | bool | None,
) -> schemas.PurchaseSubcategoryListResponse:
    request_id = ensure_request_id(None)
    parsed_active_only = parse_bool_field(
        value=active_only, field_name="active_only", request_id=request_id
    )
    parsed_category_id = parse_uuid_field(
        value=category_id, field_name="category_id", request_id=request_id
    )
    effective_active_only = parsed_active_only or not current_user.is_superuser
    rows = repository.list_subcategories(
        session=session,
        category_id=parsed_category_id,
        active_only=effective_active_only,
    )
    return schemas.PurchaseSubcategoryListResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=schemas.PurchaseSubcategoryListData(
            subcategories=[
                build_subcategory_item(subcategory, category_name)
                for subcategory, category_name in rows
            ]
        ),
    )


def create_subcategory(
    *, session: Session, current_user: User, body: schemas.RequestEnvelope
) -> schemas.PurchaseSubcategoryDetailResponse:
    request_id = ensure_request_id(body.request_id)
    ensure_admin(current_user, request_id)
    payload = validate_subcategory_payload(payload=body.payload, request_id=request_id)
    category = repository.get_category_by_id(session=session, category_id=payload.category_id)
    if not category:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: category_id",
            request_id=request_id,
            details={"category_id": "category not found"},
        )
    subcategory = PurchaseSubcategory(
        category_id=payload.category_id,
        name=payload.name,
        is_active=payload.is_active,
    )
    repository.create_subcategory(session=session, subcategory=subcategory)
    return schemas.PurchaseSubcategoryDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_subcategory_item(subcategory, category.name),
    )


def update_subcategory(
    *,
    session: Session,
    current_user: User,
    subcategory_id: str,
    body: schemas.RequestEnvelope,
) -> schemas.PurchaseSubcategoryDetailResponse:
    request_id = ensure_request_id(body.request_id)
    ensure_admin(current_user, request_id)
    parsed_subcategory_id = parse_uuid_field(
        value=subcategory_id,
        field_name="subcategory_id",
        request_id=request_id,
    )
    if parsed_subcategory_id is None:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: subcategory_id",
            request_id=request_id,
            details={"subcategory_id": "subcategory_id is required"},
        )
    subcategory = repository.get_subcategory_by_id(
        session=session, subcategory_id=parsed_subcategory_id
    )
    if not subcategory:
        raise PurchaseRecordsServiceError(
            status_code=404,
            code="NOT_FOUND",
            message="purchase subcategory not found",
            request_id=request_id,
            details={"subcategory_id": "not found"},
        )
    payload = validate_subcategory_payload(payload=body.payload, request_id=request_id)
    category = repository.get_category_by_id(session=session, category_id=payload.category_id)
    if not category:
        raise PurchaseRecordsServiceError(
            status_code=400,
            code="INVALID_ARGUMENT",
            message="invalid field: category_id",
            request_id=request_id,
            details={"category_id": "category not found"},
        )
    subcategory.category_id = payload.category_id
    subcategory.name = payload.name
    subcategory.is_active = payload.is_active
    repository.update_subcategory(session=session, subcategory=subcategory)
    return schemas.PurchaseSubcategoryDetailResponse(
        request_id=request_id,
        ts=current_timestamp_ms(),
        data=build_subcategory_item(subcategory, category.name),
    )
