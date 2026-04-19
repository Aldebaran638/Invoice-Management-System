from sqlalchemy import func
from sqlmodel import Session, select

from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from app.modules.system_management.expense_category.models import ExpenseCategory
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory


def list_expense_subcategories(
    *,
    session: Session,
    page: int,
    page_size: int,
    major_category_id: int | None,
) -> tuple[list[ExpenseSubcategory], int]:
    base_statement = select(ExpenseSubcategory)
    if major_category_id is not None:
        base_statement = base_statement.where(ExpenseSubcategory.major_category_id == major_category_id)

    total = session.exec(select(func.count()).select_from(base_statement.subquery())).one()
    statement = (
        base_statement.order_by(ExpenseSubcategory.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return session.exec(statement).all(), total


def get_expense_subcategory_by_id(*, session: Session, subcategory_id: int) -> ExpenseSubcategory | None:
    return session.get(ExpenseSubcategory, subcategory_id)


def get_expense_subcategory_by_name(*, session: Session, name: str) -> ExpenseSubcategory | None:
    statement = select(ExpenseSubcategory).where(ExpenseSubcategory.name == name)
    return session.exec(statement).first()


def get_expense_category_by_id(*, session: Session, category_id: int) -> ExpenseCategory | None:
    return session.get(ExpenseCategory, category_id)


def create_expense_subcategory(*, session: Session, subcategory: ExpenseSubcategory) -> ExpenseSubcategory:
    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory


def update_expense_subcategory(*, session: Session, subcategory: ExpenseSubcategory) -> ExpenseSubcategory:
    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory


def count_purchase_records_by_sub_category(*, session: Session, subcategory_id: int) -> int:
    statement = select(func.count()).where(PurchaseRecord.sub_category_id == subcategory_id)
    return session.exec(statement).one()


def delete_expense_subcategory(*, session: Session, subcategory: ExpenseSubcategory) -> None:
    session.delete(subcategory)
    session.commit()
