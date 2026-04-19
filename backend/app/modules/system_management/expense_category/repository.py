from sqlalchemy import func
from sqlmodel import Session, select

from app.modules.purchase_records.purchase_record_summary.models import PurchaseRecord
from app.modules.system_management.expense_category.models import ExpenseCategory
from app.modules.system_management.expense_subcategory.models import ExpenseSubcategory


def list_expense_categories(*, session: Session, page: int, page_size: int) -> tuple[list[ExpenseCategory], int]:
    base_statement = select(ExpenseCategory)
    total = session.exec(select(func.count()).select_from(base_statement.subquery())).one()
    statement = (
        base_statement.order_by(ExpenseCategory.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return session.exec(statement).all(), total


def get_expense_category_by_id(*, session: Session, category_id: int) -> ExpenseCategory | None:
    return session.get(ExpenseCategory, category_id)


def get_expense_category_by_name(*, session: Session, name: str) -> ExpenseCategory | None:
    statement = select(ExpenseCategory).where(ExpenseCategory.name == name)
    return session.exec(statement).first()


def create_expense_category(*, session: Session, category: ExpenseCategory) -> ExpenseCategory:
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def update_expense_category(*, session: Session, category: ExpenseCategory) -> ExpenseCategory:
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def count_purchase_records_by_major_category(*, session: Session, category_id: int) -> int:
    statement = select(func.count()).where(PurchaseRecord.major_category_id == category_id)
    return session.exec(statement).one()


def count_subcategories_by_major_category(*, session: Session, category_id: int) -> int:
    statement = select(func.count()).where(ExpenseSubcategory.major_category_id == category_id)
    return session.exec(statement).one()


def delete_expense_category(*, session: Session, category: ExpenseCategory) -> None:
    session.delete(category)
    session.commit()
