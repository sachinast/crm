"""Celery application entry point.

Task modules (tasks_notifications.py, tasks_sheets_sync.py — see TECHNICAL_SPEC.md §6)
land in Phase 4+ once the status state machine needs to enqueue work. This stub exists
so `celery -A app.workers.celery_app worker` boots cleanly from Phase 0 onward.
"""
from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("crm", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="app.workers.celery_app.ping")
def ping() -> str:
    return "pong"
