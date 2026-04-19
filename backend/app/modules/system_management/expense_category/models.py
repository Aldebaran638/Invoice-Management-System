from sqlalchemy import BigInteger, Column, Text
from sqlmodel import Field, SQLModel


class ExpenseCategory(SQLModel, table=True):
    __tablename__ = "expense_category"

    id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, primary_key=True, autoincrement=True),
    )
    name: str = Field(index=True, unique=True, max_length=255)
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
