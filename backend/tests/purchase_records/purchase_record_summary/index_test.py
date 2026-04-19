import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import User
from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from tests.utils.user import create_random_user

BASE_URL = f"{settings.API_V1_STR}/purchase-records/purchase-record-summary"


def _get_normal_user(db: Session) -> User:
    from app import crud

    normal_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    assert normal_user is not None
    return normal_user


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
        name=name,
        amount=amount,
        owner_id=user_id,
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


def test_admin_list_purchase_record_summary_success(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    _create_random_purchase_record(db)
    response = client.get(f"{BASE_URL}/", headers=superuser_token_headers)
    assert response.status_code == 200

    content = response.json()
    assert "data" in content
    assert "records" in content["data"]

    if content["data"]["records"]:
        first = content["data"]["records"][0]
        assert set(first.keys()) == {"id", "purchase_date", "name", "amount"}


def test_normal_user_list_only_own_records(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    own_record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        purchase_date=date(2026, 4, 20),
        name="my-record",
        amount=10.0,
    )
    other_record = _create_random_purchase_record(db)

    response = client.get(f"{BASE_URL}/", headers=normal_user_token_headers)
    assert response.status_code == 200

    records = response.json()["data"]["records"]
    record_ids = {item["id"] for item in records}
    assert str(own_record.id) in record_ids
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


def test_normal_user_detail_other_user_record_forbidden(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    other_user_record = _create_random_purchase_record(db)

    response = client.get(
        f"{BASE_URL}/{other_user_record.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert "detail" in response.json()
