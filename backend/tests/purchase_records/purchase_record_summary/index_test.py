import uuid
from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app.core.config import settings
from app.models import User
from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from app.modules.system_management.expense_category.models import ExpenseCategory
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory
from tests.utils.user import create_random_user

BASE_URL = f"{settings.API_V1_STR}/purchase-records/purchase-record-summary"
TEST_RECORD_NAME_PREFIX = "__prs_v2_test__"


def _get_normal_user(db: Session) -> User:
    from app import crud

    normal_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    assert normal_user is not None
    return normal_user


def _get_category_id_by_name(db: Session, name: str) -> int:
    statement = select(ExpenseCategory).where(ExpenseCategory.name == name)
    category = db.exec(statement).first()
    assert category is not None and category.id is not None
    return category.id


def _get_any_subcategory_id(db: Session) -> int:
    statement = select(ExpenseSubcategory).limit(1)
    subcategory = db.exec(statement).first()
    assert subcategory is not None and subcategory.id is not None
    return subcategory.id


@pytest.fixture(autouse=True)
def _cleanup_purchase_records(db: Session) -> Generator[None, None, None]:
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
    major_category_id: int,
    sub_category_id: int | None,
    name: str,
) -> PurchaseRecord:
    record = PurchaseRecord(
        purchase_date=date(2026, 4, 19),
        name=f"{TEST_RECORD_NAME_PREFIX}{name}",
        amount=100.0,
        founder_name="创始人A",
        major_category_id=major_category_id,
        sub_category_id=sub_category_id,
        remarks="测试",
        owner_id=user_id,
        is_deleted=False,
        deleted_at=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def test_admin_can_view_all_records(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    other_category_id = _get_category_id_by_name(db, "交通费用")
    user1 = create_random_user(db)
    user2 = create_random_user(db)
    assert user1.id is not None and user2.id is not None
    rec1 = _create_purchase_record_for_user(db, user1.id, major_category_id=other_category_id, sub_category_id=None, name="admin-view-1")
    rec2 = _create_purchase_record_for_user(db, user2.id, major_category_id=other_category_id, sub_category_id=None, name="admin-view-2")

    response = client.get(f"{BASE_URL}/?page=1&page_size=20", headers=superuser_token_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    ids = {item["id"] for item in body["data"]["list"]}
    assert str(rec1.id) in ids
    assert str(rec2.id) in ids


def test_list_support_major_category_filter(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    major_other = _get_category_id_by_name(db, "其他项目费用")
    major_traffic = _get_category_id_by_name(db, "交通费用")
    sub_id = _get_any_subcategory_id(db)
    user = create_random_user(db)
    assert user.id is not None
    target = _create_purchase_record_for_user(db, user.id, major_category_id=major_other, sub_category_id=sub_id, name="filter-major-target")
    _create_purchase_record_for_user(db, user.id, major_category_id=major_traffic, sub_category_id=None, name="filter-major-other")

    response = client.get(
        f"{BASE_URL}/?page=1&page_size=20&major_category_id={major_other}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]["list"]}
    assert str(target.id) in ids


def test_create_with_invalid_subcategory_rule_failed(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    major_traffic = _get_category_id_by_name(db, "交通费用")
    sub_id = _get_any_subcategory_id(db)
    payload = {
        "request_id": "req-invalid-sub-rule",
        "ts": 1700000000,
        "payload": {
            "purchase_date": "2026-04-19",
            "name": f"{TEST_RECORD_NAME_PREFIX}invalid-sub",
            "amount": 88.5,
            "founder_name": "张三",
            "major_category_id": major_traffic,
            "sub_category_id": sub_id,
            "remarks": None,
        },
    }
    response = client.post(f"{BASE_URL}/", headers=normal_user_token_headers, json=payload)
    assert response.status_code == 422


def test_create_with_required_fields_and_success_envelope(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    major_other = _get_category_id_by_name(db, "其他项目费用")
    sub_id = _get_any_subcategory_id(db)
    payload = {
        "request_id": "req-create-ok",
        "ts": 1700000010,
        "payload": {
            "purchase_date": "2026-04-20",
            "name": f"{TEST_RECORD_NAME_PREFIX}create-ok",
            "amount": 200.0,
            "founder_name": "李四",
            "major_category_id": major_other,
            "sub_category_id": sub_id,
            "remarks": "备注A",
        },
    }
    response = client.post(f"{BASE_URL}/", headers=normal_user_token_headers, json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["version"] == "1.0"
    assert body["success"] is True
    assert body["request_id"] == payload["request_id"]
    assert body["data"]["founder_name"] == "李四"
    assert body["data"]["major_category_id"] == major_other
    assert body["data"]["sub_category_id"] == sub_id


def test_delete_is_logical_and_not_returned_in_list(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    major_traffic = _get_category_id_by_name(db, "交通费用")
    normal_user = _get_normal_user(db)
    assert normal_user.id is not None
    record = _create_purchase_record_for_user(
        db,
        normal_user.id,
        major_category_id=major_traffic,
        sub_category_id=None,
        name="delete-hide",
    )

    delete_response = client.delete(f"{BASE_URL}/{record.id}", headers=normal_user_token_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["message"] == "Deleted"

    list_response = client.get(f"{BASE_URL}/?page=1&page_size=20", headers=normal_user_token_headers)
    ids = {item["id"] for item in list_response.json()["data"]["list"]}
    assert str(record.id) not in ids
