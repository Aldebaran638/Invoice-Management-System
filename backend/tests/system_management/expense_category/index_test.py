from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app.core.config import settings
from app.modules.system_management.expense_category.models import ExpenseCategory
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory

BASE_URL = f"{settings.API_V1_STR}/system-management/expense-category"
TEST_NAME_PREFIX = "__ec_test__"


@pytest.fixture(autouse=True)
def _cleanup(db: Session) -> Generator[None, None, None]:
    sub_statement = select(ExpenseSubcategory).where(
        ExpenseSubcategory.name.like(f"{TEST_NAME_PREFIX}%")
    )
    for sub in db.exec(sub_statement).all():
        db.delete(sub)
    db.execute(delete(ExpenseCategory).where(ExpenseCategory.name.like(f"{TEST_NAME_PREFIX}%")))
    db.commit()
    yield
    sub_statement = select(ExpenseSubcategory).where(
        ExpenseSubcategory.name.like(f"{TEST_NAME_PREFIX}%")
    )
    for sub in db.exec(sub_statement).all():
        db.delete(sub)
    db.execute(delete(ExpenseCategory).where(ExpenseCategory.name.like(f"{TEST_NAME_PREFIX}%")))
    db.commit()


def test_admin_crud_and_unique_and_relation_check(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    create_payload = {
        "request_id": "ec-create-1",
        "ts": 1700000100,
        "payload": {"name": f"{TEST_NAME_PREFIX}办公费用", "description": "办公"},
    }
    create_response = client.post(BASE_URL, headers=superuser_token_headers, json=create_payload)
    assert create_response.status_code == 201
    created_id = create_response.json()["data"]["id"]

    duplicate_payload = {
        "request_id": "ec-create-2",
        "ts": 1700000101,
        "payload": {"name": f"{TEST_NAME_PREFIX}办公费用", "description": "重复"},
    }
    duplicate_response = client.post(BASE_URL, headers=superuser_token_headers, json=duplicate_payload)
    assert duplicate_response.status_code == 422

    list_response = client.get(f"{BASE_URL}?page=1&page_size=20", headers=superuser_token_headers)
    assert list_response.status_code == 200

    detail_response = client.get(f"{BASE_URL}/{created_id}", headers=superuser_token_headers)
    assert detail_response.status_code == 200

    update_payload = {
        "request_id": "ec-update-1",
        "ts": 1700000102,
        "payload": {"name": f"{TEST_NAME_PREFIX}办公费用-更新", "description": "更新"},
    }
    update_response = client.put(
        f"{BASE_URL}/{created_id}", headers=superuser_token_headers, json=update_payload
    )
    assert update_response.status_code == 200

    relation_category = ExpenseCategory(name=f"{TEST_NAME_PREFIX}关联大类", description=None)
    db.add(relation_category)
    db.commit()
    db.refresh(relation_category)
    assert relation_category.id is not None

    relation_sub = ExpenseSubcategory(
        name=f"{TEST_NAME_PREFIX}关联小类",
        major_category_id=relation_category.id,
        description=None,
    )
    db.add(relation_sub)
    db.commit()

    blocked_delete = client.delete(
        f"{BASE_URL}/{relation_category.id}", headers=superuser_token_headers
    )
    assert blocked_delete.status_code == 400

    delete_response = client.delete(f"{BASE_URL}/{created_id}", headers=superuser_token_headers)
    assert delete_response.status_code == 200


def test_non_admin_forbidden(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    response = client.get(BASE_URL, headers=normal_user_token_headers)
    assert response.status_code == 403
