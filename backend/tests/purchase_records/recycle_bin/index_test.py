import uuid
from collections.abc import Generator
from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.models import User
from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from tests.utils.user import create_random_user

BASE_URL = f"{settings.API_V1_STR}/purchase_records/recycle_bin"
TEST_RECORD_NAME_PREFIX = "__rb_test__"


def _get_normal_user(db: Session) -> User:
    from app import crud

    normal_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    assert normal_user is not None
    return normal_user


@pytest.fixture(autouse=True)
def _cleanup_recycle_bin_records(db: Session) -> Generator[None, None, None]:
    db.execute(
        delete(PurchaseRecord).where(
            PurchaseRecord.name.like(f"{TEST_RECORD_NAME_PREFIX}%")
        )
    )
    db.commit()
    yield
    db.execute(
        delete(PurchaseRecord).where(
            PurchaseRecord.name.like(f"{TEST_RECORD_NAME_PREFIX}%")
        )
    )
    db.commit()


def _create_purchase_record_for_user(
    db: Session,
    user_id: uuid.UUID,
    *,
    purchase_date: date,
    name: str,
    amount: float,
    is_deleted: bool,
) -> PurchaseRecord:
    deleted_at = datetime.now(timezone.utc) if is_deleted else None
    record = PurchaseRecord(
        purchase_date=purchase_date,
        name=f"{TEST_RECORD_NAME_PREFIX}{name}",
        amount=amount,
        owner_id=user_id,
        is_deleted=is_deleted,
        deleted_at=deleted_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _create_deleted_record_for_random_user(db: Session) -> PurchaseRecord:
    user = create_random_user(db)
    assert user.id is not None
    return _create_purchase_record_for_user(
        db,
        user.id,
        purchase_date=date(2026, 4, 19),
        name="other-deleted",
        amount=66.6,
        is_deleted=True,
    )


def test_list_only_returns_own_deleted_records(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None

    own_deleted = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 20),
        name="own-deleted",
        amount=10.0,
        is_deleted=True,
    )
    own_active = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 21),
        name="own-active",
        amount=20.0,
        is_deleted=False,
    )
    other_deleted = _create_deleted_record_for_random_user(db)

    response = client.get(BASE_URL, headers=normal_user_token_headers)
    assert response.status_code == 200

    records = response.json()["data"]["records"]
    record_ids = {item["id"] for item in records}

    assert str(own_deleted.id) in record_ids
    assert str(own_active.id) not in record_ids
    assert str(other_deleted.id) not in record_ids


def test_detail_own_deleted_record_success(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None

    own_deleted = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 22),
        name="own-detail-deleted",
        amount=21.2,
        is_deleted=True,
    )

    response = client.get(f"{BASE_URL}/{own_deleted.id}", headers=normal_user_token_headers)
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["id"] == str(own_deleted.id)
    assert set(data.keys()) == {"id", "purchase_date", "name", "amount", "deleted_at"}


def test_detail_other_user_deleted_record_failed(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    other_deleted = _create_deleted_record_for_random_user(db)

    response = client.get(f"{BASE_URL}/{other_deleted.id}", headers=normal_user_token_headers)
    assert response.status_code in (403, 404)
    assert "detail" in response.json()


def test_restore_own_deleted_record_success(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None

    own_deleted = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 23),
        name="own-restore-deleted",
        amount=33.3,
        is_deleted=True,
    )

    restore_response = client.post(
        f"{BASE_URL}/{own_deleted.id}/restore",
        headers=normal_user_token_headers,
    )
    assert restore_response.status_code == 200
    assert restore_response.json()["message"] == "Restored"

    db.expire_all()
    refreshed = db.get(PurchaseRecord, own_deleted.id)
    assert refreshed is not None
    assert refreshed.is_deleted is False
    assert refreshed.deleted_at is None


def test_restored_record_not_in_recycle_bin_list(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None

    own_deleted = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 24),
        name="own-restore-hide",
        amount=44.4,
        is_deleted=True,
    )

    restore_response = client.post(
        f"{BASE_URL}/{own_deleted.id}/restore",
        headers=normal_user_token_headers,
    )
    assert restore_response.status_code == 200

    list_response = client.get(BASE_URL, headers=normal_user_token_headers)
    assert list_response.status_code == 200
    record_ids = {item["id"] for item in list_response.json()["data"]["records"]}
    assert str(own_deleted.id) not in record_ids
