from datetime import date, datetime, timezone
from decimal import Decimal

from sqlmodel import Session, select

from app.core.config import settings
from app.models import User
from app.modules.purchase_records.models import (
    PurchaseCategory,
    PurchaseRecord,
    PurchaseSubcategory,
)
from tests.utils.user import create_random_user


def create_category(*, db: Session, name: str, is_active: bool = True) -> PurchaseCategory:
    category = PurchaseCategory(name=name, is_active=is_active)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def create_subcategory(
    *,
    db: Session,
    category_id,
    name: str,
    is_active: bool = True,
) -> PurchaseSubcategory:
    subcategory = PurchaseSubcategory(
        category_id=category_id,
        name=name,
        is_active=is_active,
    )
    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)
    return subcategory


def create_record(
    *,
    db: Session,
    owner_id,
    category_id,
    subcategory_id=None,
    title: str = "购买记录",
    remark: str | None = "测试备注",
    amount: Decimal = Decimal("10.50"),
    purchase_date: date = date(2026, 4, 18),
    is_deleted: bool = False,
) -> PurchaseRecord:
    record = PurchaseRecord(
        owner_id=owner_id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        title=title,
        remark=remark,
        amount=amount,
        purchase_date=purchase_date,
        is_deleted=is_deleted,
        deleted_at=datetime.now(tz=timezone.utc) if is_deleted else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_default_normal_user(db: Session) -> User:
    user = db.exec(select(User).where(User.email == settings.EMAIL_TEST_USER)).first()
    assert user is not None
    return user


def create_another_user(db: Session) -> User:
    return create_random_user(db)
