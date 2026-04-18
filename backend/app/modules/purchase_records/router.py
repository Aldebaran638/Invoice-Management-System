from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.models import User
from app.modules.purchase_records import schemas, service

router = APIRouter(prefix="/purchase-records", tags=["purchase-records"])


def success_response(payload: Any) -> Any:
    return payload


def error_response(error: service.PurchaseRecordsServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=service.build_error_response(error).model_dump(mode="json"),
    )


@router.get("/records", response_model=schemas.PurchaseRecordListResponse)
def list_purchase_records(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: str | int | None = None,
    page_size: str | int | None = None,
    title: str | None = None,
    category_id: str | None = None,
    subcategory_id: str | None = None,
    purchase_date_start: str | None = None,
    purchase_date_end: str | None = None,
    owner_id: str | None = None,
) -> Any:
    try:
        return success_response(
            service.list_records(
                session=session,
                current_user=current_user,
                page=page,
                page_size=page_size,
                title=title,
                category_id=category_id,
                subcategory_id=subcategory_id,
                purchase_date_start=purchase_date_start,
                purchase_date_end=purchase_date_end,
                owner_id=owner_id,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.get("/records/{record_id}", response_model=schemas.PurchaseRecordDetailResponse)
def get_purchase_record(
    record_id: str,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.get_record_detail(
                session=session,
                current_user=current_user,
                record_id=record_id,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.post("/records", response_model=schemas.PurchaseRecordDetailResponse)
def create_purchase_record(
    body: schemas.RequestEnvelope,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.create_record(
                session=session,
                current_user=current_user,
                body=body,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.patch("/records/{record_id}", response_model=schemas.PurchaseRecordDetailResponse)
def update_purchase_record(
    record_id: str,
    body: schemas.RequestEnvelope,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.update_record(
                session=session,
                current_user=current_user,
                record_id=record_id,
                body=body,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.delete("/records/{record_id}", response_model=schemas.PurchaseRecordDeleteResponse)
def delete_purchase_record(
    record_id: str,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.delete_record(
                session=session,
                current_user=current_user,
                record_id=record_id,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.get("/categories", response_model=schemas.PurchaseCategoryListResponse)
def list_purchase_categories(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    active_only: str | bool | None = None,
) -> Any:
    try:
        return success_response(
            service.list_categories(
                session=session,
                current_user=current_user,
                active_only=active_only,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.post("/categories", response_model=schemas.PurchaseCategoryDetailResponse)
def create_purchase_category(
    body: schemas.RequestEnvelope,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.create_category(
                session=session,
                current_user=current_user,
                body=body,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.patch(
    "/categories/{category_id}", response_model=schemas.PurchaseCategoryDetailResponse
)
def update_purchase_category(
    category_id: str,
    body: schemas.RequestEnvelope,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.update_category(
                session=session,
                current_user=current_user,
                category_id=category_id,
                body=body,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.get("/subcategories", response_model=schemas.PurchaseSubcategoryListResponse)
def list_purchase_subcategories(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    category_id: str | None = None,
    active_only: str | bool | None = None,
) -> Any:
    try:
        return success_response(
            service.list_subcategories(
                session=session,
                current_user=current_user,
                category_id=category_id,
                active_only=active_only,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.post(
    "/subcategories", response_model=schemas.PurchaseSubcategoryDetailResponse
)
def create_purchase_subcategory(
    body: schemas.RequestEnvelope,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.create_subcategory(
                session=session,
                current_user=current_user,
                body=body,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)


@router.patch(
    "/subcategories/{subcategory_id}",
    response_model=schemas.PurchaseSubcategoryDetailResponse,
)
def update_purchase_subcategory(
    subcategory_id: str,
    body: schemas.RequestEnvelope,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    try:
        return success_response(
            service.update_subcategory(
                session=session,
                current_user=current_user,
                subcategory_id=subcategory_id,
                body=body,
            )
        )
    except service.PurchaseRecordsServiceError as exc:
        return error_response(exc)
