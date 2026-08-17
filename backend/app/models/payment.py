import uuid
from datetime import datetime

from sqlalchemy import Computed, DateTime, ForeignKey, Index, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDPKMixin

MONEY = Numeric(12, 2)


class PaymentTransaction(UUIDPKMixin, Base):
    __tablename__ = "payment_transactions"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    prepaid_amount: Mapped[float] = mapped_column(MONEY, nullable=False)
    pay_at_counter_amount: Mapped[float] = mapped_column(MONEY, nullable=False)
    total_amount: Mapped[float] = mapped_column(
        MONEY, Computed("prepaid_amount + pay_at_counter_amount", persisted=True)
    )
    # Never store a raw PAN — only a last-4 for display and a token from the PCI-compliant
    # processor/vault (Stripe, Braintree, ...). See TECHNICAL_SPEC.md §8.
    card_last_four: Mapped[str | None] = mapped_column(Text)
    card_token: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    processed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_payments_lead", "lead_id"),)
