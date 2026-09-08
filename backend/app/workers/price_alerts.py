import asyncio
import logging
import smtplib
from datetime import UTC, date, datetime
from email.message import EmailMessage

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models import Alert, PriceHistory
from app.providers import ProviderError, get_flight_provider
from app.schemas.flight import SearchRequest

logger = logging.getLogger("aeroopt.price_alerts")


def _send_email(recipient: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.email_alerts_configured:
        logger.warning(
            "Price target reached but SMTP is not configured", extra={"recipient": recipient}
        )
        return
    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as client:
        if settings.smtp_use_tls:
            client.starttls()
        if settings.smtp_username and settings.smtp_password:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)


async def check_price_alerts() -> dict[str, int]:
    settings = get_settings()
    if date.today().year < 2000:
        raise RuntimeError("System clock is invalid")
    checked = triggered = failed = 0
    with SessionLocal() as db:
        alerts = list(db.scalars(select(Alert).where(Alert.is_active.is_(True))))
        for alert in alerts:
            if alert.departure_date < date.today():
                alert.is_active = False
                continue
            provider = None
            try:
                provider = get_flight_provider(settings)
                offers = await provider.search_flights(
                    SearchRequest(
                        origin=alert.origin,
                        destination=alert.destination,
                        departure_date=alert.departure_date,
                        currency=alert.currency,
                    )
                )
                if not offers:
                    continue
                current = min(offer.total_price for offer in offers)
                alert.last_checked_at = datetime.now(UTC)
                alert.last_price = current
                db.add(
                    PriceHistory(
                        alert_id=alert.id,
                        origin=alert.origin,
                        destination=alert.destination,
                        departure_date=alert.departure_date,
                        price=current,
                        currency=alert.currency,
                        provider=provider.name,
                    )
                )
                checked += 1
                if current <= alert.target_price:
                    await asyncio.to_thread(
                        _send_email,
                        alert.notification_email,
                        f"AeroOpt price alert: {alert.origin} to {alert.destination}",
                        (
                            f"The latest observed fare is {alert.currency} {current:,.0f}, "
                            f"at or below your {alert.currency} {alert.target_price:,.0f} target. "
                            "Open AeroOpt to revalidate the fare before booking."
                        ),
                    )
                    triggered += 1
            except ProviderError:
                failed += 1
                logger.exception(
                    "Provider failed while checking alert", extra={"alert_id": alert.id}
                )
            finally:
                if provider:
                    await provider.close()
        db.commit()
    return {"checked": checked, "triggered": triggered, "failed": failed}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(asyncio.run(check_price_alerts()))
