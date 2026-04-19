import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.models import User
from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from tests.utils.user import create_random_user

BASE_URL = f"{settings.API_V1_STR}/purchase-records/purchase-record-summary"
TEST_RECORD_NAME_PREFIX = "__prs_test__"


def _get_normal_user(db: Session) -> User:
    from app import crud

    normal_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    assert normal_user is not None
    return normal_user


@pytest.fixture(autouse=True)
def _cleanup_purchase_records(db: Session) -> None:
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
) -> PurchaseRecord:
    record = PurchaseRecord(
        purchase_date=purchase_date,
        name=f"{TEST_RECORD_NAME_PREFIX}{name}",
        amount=amount,
        owner_id=user_id,
        is_deleted=False,
        deleted_at=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _create_random_purchase_record(db: Session) -> PurchaseRecord:
    user = create_random_user(db)
    assert user.id is not None
    return _create_purchase_record_for_user(
        db,
        user.id,
        purchase_date=date(2026, 4, 19),
        name="other-record",
        amount=42.5,
    )


def _mark_deleted(db: Session, record: PurchaseRecord) -> None:
    record.is_deleted = True
    db.add(record)
    db.commit()
    db.refresh(record)


def test_list_only_returns_own_not_deleted_records(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    own_record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 18),
        name="my-record",
        amount=12.3,
    )
    own_deleted_record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 17),
        name="my-deleted-record",
        amount=10.0,
    )
    _mark_deleted(db, own_deleted_record)
    other_record = _create_random_purchase_record(db)

    response = client.get(f"{BASE_URL}/", headers=normal_user_token_headers)
    assert response.status_code == 200

    records = response.json()["data"]["records"]
    record_ids = {item["id"] for item in records}
    assert str(own_record.id) in record_ids
    assert str(own_deleted_record.id) not in record_ids
    assert str(other_record.id) not in record_ids


def test_normal_user_detail_own_record_success(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    own_record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 21),
        name="my-detail-record",
        amount=20.5,
    )

    response = client.get(
        f"{BASE_URL}/{own_record.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200

    content = response.json()
    assert "data" in content
    assert content["data"]["id"] == str(own_record.id)
    assert set(content["data"].keys()) == {"id", "purchase_date", "name", "amount"}


def test_normal_user_detail_other_user_record_failed(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    other_user_record = _create_random_purchase_record(db)

    response = client.get(
        f"{BASE_URL}/{other_user_record.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code in (403, 404)
    assert "detail" in response.json()


def test_create_purchase_record_success(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    payload = {
        "purchase_date": "2026-04-22",
        "name": f"{TEST_RECORD_NAME_PREFIX}new-record",
        "amount": 18.8,
    }
    response = client.post(f"{BASE_URL}/", headers=normal_user_token_headers, json=payload)
    assert response.status_code == 201

    content = response.json()["data"]
    assert content["purchase_date"] == payload["purchase_date"]
    assert content["name"] == payload["name"]
    assert content["amount"] == payload["amount"]

    created = db.get(PurchaseRecord, uuid.UUID(content["id"]))
    assert created is not None
    normal_user = _get_normal_user(db)
    assert created.owner_id == normal_user.id


def test_create_purchase_record_required_field_validation_failed(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    payload = {
        "purchase_date": "2026-04-22",
        "amount": 18.8,
    }
    response = client.post(f"{BASE_URL}/", headers=normal_user_token_headers, json=payload)
    assert response.status_code == 422


def test_update_own_purchase_record_success(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 22),
        name="before-update",
        amount=22.0,
    )

    payload = {
        "purchase_date": "2026-04-23",
        "name": f"{TEST_RECORD_NAME_PREFIX}after-update",
        "amount": 30.5,
    }
    response = client.put(
        f"{BASE_URL}/{record.id}",
        headers=normal_user_token_headers,
        json=payload,
    )
    assert response.status_code == 200
    content = response.json()["data"]
    assert content["purchase_date"] == payload["purchase_date"]
    assert content["name"] == payload["name"]
    assert content["amount"] == payload["amount"]


def test_logical_delete_success(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 24),
        name="to-delete",
        amount=66.6,
    )

    response = client.delete(
        f"{BASE_URL}/{record.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Deleted"

    db.expire_all()
    refreshed = db.get(PurchaseRecord, record.id)
    assert refreshed is not None
    assert refreshed.is_deleted is True
    assert refreshed.deleted_at is not None


def test_deleted_record_not_in_default_list(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 25),
        name="delete-and-hide",
        amount=11.1,
    )

    delete_response = client.delete(
        f"{BASE_URL}/{record.id}",
        headers=normal_user_token_headers,
    )
    assert delete_response.status_code == 200

    list_response = client.get(f"{BASE_URL}/", headers=normal_user_token_headers)
    assert list_response.status_code == 200
    record_ids = {item["id"] for item in list_response.json()["data"]["records"]}
    assert str(record.id) not in record_ids
