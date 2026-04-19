from fastapi import APIRouter

from app.api.routes import items, login, private, users, utils
from app.core.config import settings
from app.modules.purchase_records.recycle_bin import router as recycle_bin_router
from app.modules.purchase_records.purchase_record_summary import (
    router as purchase_record_summary_router,
)

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(purchase_record_summary_router.router)
api_router.include_router(recycle_bin_router.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
