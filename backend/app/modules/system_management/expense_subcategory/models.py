from sqlalchemy import BigInteger, Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class ExpenseSubcategory(SQLModel, table=True):
    __tablename__ = "expense_subcategory"

    id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, primary_key=True, autoincrement=True),
    )
    name: str = Field(index=True, unique=True, max_length=255)
    major_category_id: int = Field(
        sa_column=Column(
            BigInteger,
            ForeignKey("expense_category.id"),
            nullable=False,
        )
    )
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
