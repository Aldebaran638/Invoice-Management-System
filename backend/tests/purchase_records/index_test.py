from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.purchase_records.helpers import (
    create_another_user,
    create_category,
    create_record,
    create_subcategory,
    get_default_normal_user,
)


def test_list_purchase_records_normal_user_only_own_data(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="差旅费")
    current_user = get_default_normal_user(db)
    another_user = create_another_user(db)
    create_record(db=db, owner_id=current_user.id, category_id=category.id, title="我的记录")
    create_record(db=db, owner_id=another_user.id, category_id=category.id, title="别人的记录")

    response = client.get(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        params={"title": "记录"},
    )
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["data"]["records"]]
    assert "我的记录" in titles
    assert "别人的记录" not in titles


def test_list_purchase_records_admin_can_see_all(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="设备费")
    owner_a = create_another_user(db)
    owner_b = create_another_user(db)
    create_record(db=db, owner_id=owner_a.id, category_id=category.id, title="管理员可见-A")
    create_record(db=db, owner_id=owner_b.id, category_id=category.id, title="管理员可见-B")

    response = client.get(
        "/api/v1/purchase-records/records",
        headers=superuser_token_headers,
        params={"title": "管理员可见-"},
    )
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["data"]["records"]]
    assert "管理员可见-A" in titles
    assert "管理员可见-B" in titles


def test_list_purchase_records_invalid_date_range(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        params={"purchase_date_start": "2026-04-19", "purchase_date_end": "2026-04-18"},
    )
    assert response.status_code == 400
    content = response.json()
    assert content["code"] == "INVALID_ARGUMENT"
    assert "purchase_date_start" in content["error"]["details"]


def test_list_purchase_records_forbidden_owner_filter_for_normal_user(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    another_user = create_another_user(db)
    response = client.get(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        params={"owner_id": str(another_user.id)},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_get_purchase_record_detail(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    current_user = get_default_normal_user(db)
    category = create_category(db=db, name="软件费")
    record = create_record(db=db, owner_id=current_user.id, category_id=category.id, title="详情记录")

    response = client.get(
        f"/api/v1/purchase-records/records/{record.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["data"]["id"] == str(record.id)
    assert content["data"]["title"] == "详情记录"


def test_get_purchase_record_detail_forbidden_for_other_user(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="权限测试分类")
    another_user = create_another_user(db)
    record = create_record(db=db, owner_id=another_user.id, category_id=category.id, title="他人详情记录")

    response = client.get(
        f"/api/v1/purchase-records/records/{record.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_create_purchase_record(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="办公用品")
    response = client.post(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-create-record",
            "ts": 1710000000000,
            "payload": {
                "title": "鼠标",
                "remark": "罗技",
                "amount": "0.00",
                "purchase_date": "2026-04-18",
                "category_id": str(category.id),
                "subcategory_id": None,
            },
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["success"] is True
    assert content["request_id"] == "req-create-record"
    assert content["data"]["amount"] == "0.00"


def test_create_purchase_record_requires_subcategory_for_other_expense(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    other_category = create_category(db=db, name="其他费用")
    response = client.post(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-sub-required",
            "ts": 1710000000000,
            "payload": {
                "title": "无小类记录",
                "remark": "备注",
                "amount": "10.00",
                "purchase_date": "2026-04-18",
                "category_id": str(other_category.id),
                "subcategory_id": None,
            },
        },
    )
    assert response.status_code == 400
    content = response.json()
    assert content["code"] == "INVALID_ARGUMENT"
    assert "subcategory_id" in content["error"]["details"]


def test_create_purchase_record_reject_subcategory_when_not_other_expense(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="普通分类")
    other_category = create_category(db=db, name="其他费用")
    subcategory = create_subcategory(db=db, category_id=other_category.id, name="杂项")

    response = client.post(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-sub-not-allowed",
            "ts": 1710000000000,
            "payload": {
                "title": "非法小类",
                "remark": "备注",
                "amount": "10.00",
                "purchase_date": "2026-04-18",
                "category_id": str(category.id),
                "subcategory_id": str(subcategory.id),
            },
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_ARGUMENT"


def test_update_purchase_record(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    current_user = get_default_normal_user(db)
    category = create_category(db=db, name="更新前分类")
    other_category = create_category(db=db, name="其他费用")
    subcategory = create_subcategory(db=db, category_id=other_category.id, name="杂项")
    record = create_record(db=db, owner_id=current_user.id, category_id=category.id, title="更新前")

    response = client.patch(
        f"/api/v1/purchase-records/records/{record.id}",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-update-record",
            "ts": 1710000000000,
            "payload": {
                "title": "更新后",
                "remark": "更新备注",
                "amount": "88.00",
                "purchase_date": "2026-04-18",
                "category_id": str(other_category.id),
                "subcategory_id": str(subcategory.id),
            },
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["data"]["title"] == "更新后"
    assert content["data"]["subcategory_id"] == str(subcategory.id)


def test_update_deleted_purchase_record_rejected(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    current_user = get_default_normal_user(db)
    category = create_category(db=db, name="已删除更新分类")
    record = create_record(db=db, owner_id=current_user.id, category_id=category.id, title="待删除后更新")

    delete_response = client.delete(
        f"/api/v1/purchase-records/records/{record.id}",
        headers=normal_user_token_headers,
    )
    assert delete_response.status_code == 200

    update_response = client.patch(
        f"/api/v1/purchase-records/records/{record.id}",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-update-deleted",
            "ts": 1710000000000,
            "payload": {
                "title": "不应成功",
                "remark": "备注",
                "amount": "10.00",
                "purchase_date": "2026-04-18",
                "category_id": str(category.id),
                "subcategory_id": None,
            },
        },
    )
    assert update_response.status_code == 404
    assert update_response.json()["code"] == "NOT_FOUND"


def test_delete_purchase_record_and_hide_from_default_list(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    current_user = get_default_normal_user(db)
    category = create_category(db=db, name="逻辑删除分类")
    record = create_record(db=db, owner_id=current_user.id, category_id=category.id, title="逻辑删除记录")

    delete_response = client.delete(
        f"/api/v1/purchase-records/records/{record.id}",
        headers=normal_user_token_headers,
    )
    assert delete_response.status_code == 200
    delete_content = delete_response.json()
    assert delete_content["data"]["is_deleted"] is True

    list_response = client.get(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        params={"title": "逻辑删除记录"},
    )
    assert list_response.status_code == 200
    titles = [item["title"] for item in list_response.json()["data"]["records"]]
    assert "逻辑删除记录" not in titles


def test_invalid_argument_for_record_payload(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="普通分类")
    response = client.post(
        "/api/v1/purchase-records/records",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-invalid",
            "ts": 1710000000000,
            "payload": {
                "title": "非法记录",
                "remark": "备注",
                "amount": "1.001",
                "purchase_date": "2026-04-18",
                "category_id": str(category.id),
                "subcategory_id": "not-a-uuid",
            },
        },
    )
    assert response.status_code == 400
    content = response.json()
    assert content["code"] == "INVALID_ARGUMENT"
    assert "subcategory_id" in content["error"]["details"] or "amount" in content["error"]["details"]


def test_categories_list_normal_user_only_active_even_when_active_only_false(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    create_category(db=db, name="启用大类", is_active=True)
    create_category(db=db, name="停用大类", is_active=False)

    response = client.get(
        "/api/v1/purchase-records/categories",
        headers=normal_user_token_headers,
        params={"active_only": "false"},
    )
    assert response.status_code == 200
    categories = response.json()["data"]["categories"]
    assert all(item["is_active"] is True for item in categories)


def test_categories_list_admin_can_see_all_when_active_only_false(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    create_category(db=db, name="管理员启用大类", is_active=True)
    create_category(db=db, name="管理员停用大类", is_active=False)

    response = client.get(
        "/api/v1/purchase-records/categories",
        headers=superuser_token_headers,
        params={"active_only": "false"},
    )
    assert response.status_code == 200
    categories = response.json()["data"]["categories"]
    assert any(item["is_active"] is False for item in categories)


def test_create_category_admin_success(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/purchase-records/categories",
        headers=superuser_token_headers,
        json={
            "request_id": "req-create-category",
            "ts": 1710000000000,
            "payload": {"name": "管理员配置项", "is_active": True},
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "管理员配置项"


def test_create_category_non_admin_forbidden(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/purchase-records/categories",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-forbidden",
            "ts": 1710000000000,
            "payload": {"name": "普通用户配置项", "is_active": True},
        },
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_update_category_admin_success(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="待更新大类", is_active=True)
    response = client.patch(
        f"/api/v1/purchase-records/categories/{category.id}",
        headers=superuser_token_headers,
        json={
            "request_id": "req-update-category",
            "ts": 1710000000000,
            "payload": {"name": "已更新大类", "is_active": False},
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["data"]["name"] == "已更新大类"
    assert content["data"]["is_active"] is False


def test_subcategories_list_normal_user_only_active_even_when_active_only_false(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="其他费用")
    create_subcategory(db=db, category_id=category.id, name="启用小类", is_active=True)
    create_subcategory(db=db, category_id=category.id, name="停用小类", is_active=False)

    response = client.get(
        "/api/v1/purchase-records/subcategories",
        headers=normal_user_token_headers,
        params={"category_id": str(category.id), "active_only": "false"},
    )
    assert response.status_code == 200
    subcategories = response.json()["data"]["subcategories"]
    assert all(item["is_active"] is True for item in subcategories)


def test_subcategories_list_admin_can_see_all_and_filter_by_category(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    category_a = create_category(db=db, name="其他费用")
    category_b = create_category(db=db, name="第二分类")
    sub_a_active = create_subcategory(db=db, category_id=category_a.id, name="A-启用", is_active=True)
    create_subcategory(db=db, category_id=category_a.id, name="A-停用", is_active=False)
    create_subcategory(db=db, category_id=category_b.id, name="B-启用", is_active=True)

    response = client.get(
        "/api/v1/purchase-records/subcategories",
        headers=superuser_token_headers,
        params={"category_id": str(category_a.id), "active_only": "false"},
    )
    assert response.status_code == 200
    subcategories = response.json()["data"]["subcategories"]
    ids = {item["id"] for item in subcategories}
    assert str(sub_a_active.id) in ids
    assert all(item["category_id"] == str(category_a.id) for item in subcategories)


def test_create_subcategory_admin_success(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="其他费用")
    response = client.post(
        "/api/v1/purchase-records/subcategories",
        headers=superuser_token_headers,
        json={
            "request_id": "req-create-subcategory",
            "ts": 1710000000000,
            "payload": {
                "category_id": str(category.id),
                "name": "新增小类",
                "is_active": True,
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "新增小类"


def test_create_subcategory_non_admin_forbidden(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="其他费用")
    response = client.post(
        "/api/v1/purchase-records/subcategories",
        headers=normal_user_token_headers,
        json={
            "request_id": "req-subcategory-forbidden",
            "ts": 1710000000000,
            "payload": {
                "category_id": str(category.id),
                "name": "普通用户新增小类",
                "is_active": True,
            },
        },
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_update_subcategory_admin_success(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_category(db=db, name="其他费用")
    subcategory = create_subcategory(db=db, category_id=category.id, name="待更新小类", is_active=True)
    response = client.patch(
        f"/api/v1/purchase-records/subcategories/{subcategory.id}",
        headers=superuser_token_headers,
        json={
            "request_id": "req-update-subcategory",
            "ts": 1710000000000,
            "payload": {
                "category_id": str(category.id),
                "name": "已更新小类",
                "is_active": False,
            },
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["data"]["name"] == "已更新小类"
    assert content["data"]["is_active"] is False


def test_invalid_argument_for_category_active_only(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/purchase-records/categories",
        headers=normal_user_token_headers,
        params={"active_only": "not-bool"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_ARGUMENT"
