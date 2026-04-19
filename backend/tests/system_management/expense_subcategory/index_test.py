from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.modules.system_management.expense_category.models import ExpenseCategory
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory

BASE_URL = f"{settings.API_V1_STR}/system-management/expense-subcategory"
TEST_NAME_PREFIX = "__es_test__"


@pytest.fixture(autouse=True)
def _cleanup(db: Session) -> Generator[None, None, None]:
    db.execute(delete(ExpenseSubcategory).where(ExpenseSubcategory.name.like(f"{TEST_NAME_PREFIX}%")))
    db.execute(delete(ExpenseCategory).where(ExpenseCategory.name.like(f"{TEST_NAME_PREFIX}%")))
    db.commit()
    yield
    db.execute(delete(ExpenseSubcategory).where(ExpenseSubcategory.name.like(f"{TEST_NAME_PREFIX}%")))
    db.execute(delete(ExpenseCategory).where(ExpenseCategory.name.like(f"{TEST_NAME_PREFIX}%")))
    db.commit()


def test_admin_crud_and_unique_and_major_relation(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    major = ExpenseCategory(name=f"{TEST_NAME_PREFIX}大类", description=None)
    db.add(major)
    db.commit()
    db.refresh(major)
    assert major.id is not None

    create_payload = {
        "request_id": "es-create-1",
        "ts": 1700000200,
        "payload": {
            "name": f"{TEST_NAME_PREFIX}小类A",
            "major_category_id": major.id,
            "description": "desc",
        },
    }
    create_response = client.post(BASE_URL, headers=superuser_token_headers, json=create_payload)
    assert create_response.status_code == 201
    created_id = create_response.json()["data"]["id"]

    duplicate_response = client.post(BASE_URL, headers=superuser_token_headers, json=create_payload)
    assert duplicate_response.status_code == 422

    invalid_major_payload = {
        "request_id": "es-create-2",
        "ts": 1700000201,
        "payload": {
            "name": f"{TEST_NAME_PREFIX}小类B",
            "major_category_id": 999999,
            "description": None,
        },
    }
    invalid_major_response = client.post(
        BASE_URL,
        headers=superuser_token_headers,
        json=invalid_major_payload,
    )
    assert invalid_major_response.status_code == 422

    list_response = client.get(
        f"{BASE_URL}?page=1&page_size=20&major_category_id={major.id}",
        headers=superuser_token_headers,
    )
    assert list_response.status_code == 200

    detail_response = client.get(f"{BASE_URL}/{created_id}", headers=superuser_token_headers)
    assert detail_response.status_code == 200

    update_payload = {
        "request_id": "es-update-1",
        "ts": 1700000202,
        "payload": {
            "name": f"{TEST_NAME_PREFIX}小类A-更新",
            "major_category_id": major.id,
            "description": "update",
        },
    }
    update_response = client.put(
        f"{BASE_URL}/{created_id}", headers=superuser_token_headers, json=update_payload
    )
    assert update_response.status_code == 200

    delete_response = client.delete(f"{BASE_URL}/{created_id}", headers=superuser_token_headers)
    assert delete_response.status_code == 200


def test_non_admin_forbidden(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    response = client.get(BASE_URL, headers=normal_user_token_headers)
    assert response.status_code == 403
