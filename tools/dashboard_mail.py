"""
Commandline mailer voor Recranet dashboardrapporten.

Gebruik:
    python tools/dashboard_mail.py /dashboard waschappelse-rups
    python tools/dashboard_mail.py /dashboard "Camping de Waschappelse Rups" --to naam@example.nl
    python tools/dashboard_mail.py /dashboard andere-camping --preview

Deze mailer sluit aan op de bestaande Gmail API OAuth-flow uit
ga4-akeneo-gap-analyzer: standaard wordt hetzelfde token.json gebruikt.
"""

import argparse
import base64
import html
import json
import os
import sys
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SHARED_TOKEN = ROOT.parent / "ga4-akeneo-gap-analyzer" / "token.json"
DEFAULT_TO = "luuklouwerse.weststrate@gmail.com"
DEFAULT_FROM_LABEL = "Recranet Dashboard"
DEFAULT_DASHBOARD_URL = "http://localhost:5173/dashboard"
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

CYAN = "#1FB6DC"
RECRANET_BLUE = "#07365F"
DARK = "#071F33"
PANEL = "#0B2B43"
PANEL_SOFT = "#0F334C"
TEXT = "#FFFFFF"
MUTED = "#A9BDCA"
LINE = "#1E4962"
SOFT = "#0F334C"
RED = "#DF7A2D"
AMBER = "#DF9A28"


DASHBOARDS = {
    "waschappelse-rups": {
        "name": "Camping de Waschappelse Rups",
        "period": "Laatste 30 dagen",
        "revenue": 62340,
        "revenue_delta": 18.4,
        "bookings": 128,
        "booking_delta": 9.5,
        "roas": 6.67,
        "organic_clicks": 5860,
        "occupancy": 74,
        "forecast": 78300,
        "payment_completion": 91,
        "top_campaign": "Search - Camping Walcheren aan zee",
        "top_campaign_roas": 9.8,
        "top_query": "camping westkapelle",
        "top_query_clicks": 930,
        "alerts": [
            {
                "type": "Kans",
                "title": "Campagne Walcheren heeft budgetruimte",
                "detail": "ROAS 9,8x bij 62% impression share. Extra dagbudget is verdedigbaar.",
            },
            {
                "type": "Risico",
                "title": "Mobiele boekingsratio blijft achter",
                "detail": "Mobiel levert 63% van sessies, maar converteert 46% lager dan desktop.",
            },
            {
                "type": "Kans",
                "title": "Terugkerende gasten converteren het best",
                "detail": "Segment haalt 7,1% conversie. E-mail en remarketing kunnen dit vergroten.",
            },
        ],
        "actions": [
            "Verhoog budget op Walcheren-campagnes met 20%.",
            "Maak prijsindicatie eerder zichtbaar op mobiel.",
            "Publiceer landingspagina familiecamping Walcheren.",
            "Activeer terugkerende gasten met vroegboekaanbod.",
        ],
    }
}


def euro(value):
    return f"EUR {value:,.0f}".replace(",", ".")


def number(value):
    return f"{value:,.0f}".replace(",", ".")


def pct(value):
    return f"{value:.1f}%".replace(".", ",")


def ratio(value):
    return f"{value:.2f}x".replace(".", ",")


def normalize_slug(raw):
    cleaned = [part for part in raw if not part.startswith("http://") and not part.startswith("https://")]
    value = " ".join(cleaned).strip()
    if value.startswith("/dashboard"):
        value = value.removeprefix("/dashboard").strip()
    value = value.lower().replace("camping de ", "").replace("camping ", "")
    value = value.replace("_", "-").replace(" ", "-")
    while "--" in value:
        value = value.replace("--", "-")
    return value.strip("-") or "waschappelse-rups"


def title_from_slug(slug):
    return "Camping " + " ".join(part.capitalize() for part in slug.split("-"))


def get_dashboard(slug):
    if slug in DASHBOARDS:
        return DASHBOARDS[slug]

    template = DASHBOARDS["waschappelse-rups"].copy()
    template["name"] = title_from_slug(slug)
    return template


def load_credentials(token_file):
    if not token_file.exists():
        raise FileNotFoundError(
            f"Geen Gmail-token gevonden: {token_file}\n"
            "Draai eerst in ga4-akeneo-gap-analyzer: python auto_analyze.py --setup"
        )

    with token_file.open("r", encoding="utf-8") as handle:
        token_data = json.load(handle)

    scopes = token_data.get("scopes") or []
    if "https://www.googleapis.com/auth/gmail.send" not in scopes:
        raise RuntimeError(
            "Het bestaande Google-token mist gmail.send rechten.\n"
            "Draai opnieuw in ga4-akeneo-gap-analyzer: python auto_analyze.py --setup"
        )

    creds = Credentials.from_authorized_user_info(token_data, scopes)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        token_file.write_text(json.dumps(token_data, indent=2), encoding="utf-8")

    if not creds.valid:
        raise RuntimeError("Google-token is niet geldig. Draai de OAuth setup opnieuw.")

    return creds


def kpi(label, value, color=CYAN):
    return f"""
      <td style="width:25%;padding:0 6px 12px 0;">
        <div style="background:{SOFT};border:1px solid {LINE};border-radius:8px;padding:14px 12px;">
          <div style="font-size:20px;font-weight:800;color:{color};">{html.escape(str(value))}</div>
          <div style="font-size:11px;color:{MUTED};text-transform:uppercase;font-weight:700;margin-top:3px;">{html.escape(label)}</div>
        </div>
      </td>
    """


def logo_html():
    return (
        f'<span style="display:inline-block;background:{RECRANET_BLUE};color:#FFFFFF;'
        'border-radius:5px;padding:8px 13px;font-size:23px;line-height:23px;'
        'font-weight:800;letter-spacing:0;">recranet</span>'
    )


def build_html_report(data, dashboard_url, recipient_name):
    today = datetime.now().strftime("%d-%m-%Y")
    alert_rows = "".join(
        f"""
        <tr>
          <td style="padding:12px;border-bottom:1px solid {LINE};vertical-align:top;">
            <strong style="color:{CYAN if item['type'] == 'Kans' else RED};">{html.escape(item['type'])}</strong>
          </td>
          <td style="padding:12px;border-bottom:1px solid {LINE};vertical-align:top;">
            <strong style="color:{TEXT};">{html.escape(item['title'])}</strong><br>
            <span style="color:{MUTED};font-size:13px;line-height:1.45;">{html.escape(item['detail'])}</span>
          </td>
        </tr>
        """
        for item in data["alerts"]
    )
    action_rows = "".join(
        f"<li style='margin:0 0 8px 0;'>{html.escape(action)}</li>"
        for action in data["actions"]
    )

    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:{DARK};font-family:Arial,Helvetica,sans-serif;color:{TEXT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{DARK};padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="background:{PANEL};border:1px solid {LINE};border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background:{DARK};padding:24px 28px;border-bottom:1px solid {LINE};">
      {logo_html()}
      <div style="color:#FFFFFF;font-size:22px;font-weight:800;margin-top:18px;">Je dashboardrapport staat klaar</div>
      <div style="color:{MUTED};font-size:13px;margin-top:5px;">{html.escape(data['name'])} &middot; {html.escape(data['period'])} &middot; {today}</div>
    </td>
  </tr>
  <tr><td style="padding:24px 28px 8px 28px;">
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px 0;color:{TEXT};">Hoi {html.escape(recipient_name)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0;color:{TEXT};">
      Hierbij je Recranet dashboardupdate voor <strong>{html.escape(data['name'])}</strong>.
      In deze mail vat ik de belangrijkste omzet-, marketing- en boekingssignalen samen,
      zodat je snel ziet waar aandacht nodig is en waar juist ruimte zit om op te schalen.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
      <tr><td>
        <a href="{html.escape(dashboard_url)}" style="display:inline-block;background:{CYAN};color:{DARK};text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:800;font-size:14px;">
          Open het dashboard
        </a>
      </td>
      <td style="padding-left:12px;color:{MUTED};font-size:12px;">
        Werkt de knop niet? Gebruik deze link:<br>
        <a href="{html.escape(dashboard_url)}" style="color:{CYAN};font-weight:700;">{html.escape(dashboard_url)}</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:22px 28px 6px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      {kpi("Boekomzet", euro(data["revenue"]))}
      {kpi("Prognose", euro(data["forecast"]))}
      {kpi("Boekingen", number(data["bookings"]))}
      {kpi("ROAS", ratio(data["roas"]))}
    </tr><tr>
      {kpi("Bezetting", pct(data["occupancy"]))}
      {kpi("Organische klikken", number(data["organic_clicks"]))}
      {kpi("Betaalcompletion", pct(data["payment_completion"]))}
      {kpi("Omzetgroei", pct(data["revenue_delta"]), AMBER)}
    </tr></table>
  </td></tr>
  <tr><td style="padding:8px 28px 18px 28px;">
    <div style="border:1px solid {LINE};border-radius:8px;padding:16px;background:{PANEL_SOFT};">
      <div style="font-size:13px;color:{MUTED};font-weight:700;text-transform:uppercase;">Wat valt op?</div>
      <p style="font-size:15px;line-height:1.55;margin:8px 0 0 0;">
        De website draait op {euro(data["revenue"])} boekomzet met {number(data["bookings"])} online boekingen.
        De prognose komt uit op {euro(data["forecast"])}. Beste campagne is
        <strong>{html.escape(data["top_campaign"])}</strong> met {ratio(data["top_campaign_roas"])} ROAS.
        Organisch trekt <strong>{html.escape(data["top_query"])}</strong> de meeste vraag.
      </p>
    </div>
  </td></tr>
  <tr><td style="padding:4px 28px 8px 28px;">
    <h2 style="font-size:17px;margin:0;color:{TEXT};">Belangrijkste signalen</h2>
  </td></tr>
  <tr><td style="padding:0 28px 18px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid {LINE};border-radius:8px;overflow:hidden;">
      {alert_rows}
    </table>
  </td></tr>
  <tr><td style="padding:0 28px 24px 28px;">
    <h2 style="font-size:17px;margin:0 0 10px 0;color:{TEXT};">Acties voor deze week</h2>
    <ol style="margin:0;padding-left:22px;color:{TEXT};line-height:1.45;">{action_rows}</ol>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid {LINE};color:{MUTED};font-size:12px;">
    {logo_html()}<br><br>
    Automatische dashboardmail vanuit Recranet dashboardrapportage. Prototype met representatieve voorbeelddata, voorbereid op live koppelingen.
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def build_text_report(data, dashboard_url, recipient_name):
    lines = [
        f"Hoi {recipient_name},",
        "",
        f"Je Recranet dashboardrapport staat klaar voor {data['name']}.",
        f"Periode: {data['period']}",
        f"Dashboard: {dashboard_url}",
        "",
        f"Boekomzet: {euro(data['revenue'])} ({pct(data['revenue_delta'])})",
        f"Prognose maandeinde: {euro(data['forecast'])}",
        f"Boekingen: {number(data['bookings'])} ({pct(data['booking_delta'])})",
        f"ROAS: {ratio(data['roas'])}",
        f"Organische klikken: {number(data['organic_clicks'])}",
        f"Bezetting: {pct(data['occupancy'])}",
        "",
        "Belangrijkste signalen:",
    ]
    for item in data["alerts"]:
        lines.append(f"- {item['type']}: {item['title']} - {item['detail']}")
    lines.append("")
    lines.append("Acties:")
    for action in data["actions"]:
        lines.append(f"- {action}")
    return "\n".join(lines)


def send_email(credentials, to_address, subject, text, html_body, from_label):
    service = build("gmail", "v1", credentials=credentials)
    message = MIMEMultipart("alternative")
    message["To"] = to_address
    message["Subject"] = subject
    message["From"] = from_label
    message.attach(MIMEText(text, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return service.users().messages().send(userId="me", body={"raw": raw}).execute()


def parse_args():
    parser = argparse.ArgumentParser(description="Verstuur een Recranet dashboardrapport per mail.")
    parser.add_argument("command", nargs="*", help='Bijv. /dashboard waschappelse-rups')
    parser.add_argument("--to", default=os.environ.get("DASHBOARD_EMAIL_TO", DEFAULT_TO))
    parser.add_argument("--token-file", default=os.environ.get("GOOGLE_TOKEN_FILE", str(DEFAULT_SHARED_TOKEN)))
    parser.add_argument("--dashboard-url", default=os.environ.get("DASHBOARD_URL", DEFAULT_DASHBOARD_URL))
    parser.add_argument("--name", default=os.environ.get("DASHBOARD_RECIPIENT_NAME", "Luuk"))
    parser.add_argument("--preview", action="store_true", help="Schrijf HTML-preview zonder te verzenden.")
    return parser.parse_args()


def main():
    args = parse_args()
    slug = normalize_slug(args.command)
    data = get_dashboard(slug)
    subject = f"Recranet dashboardupdate: {data['name']}"
    html_body = build_html_report(data, args.dashboard_url, args.name)
    text = build_text_report(data, args.dashboard_url, args.name)

    preview_path = ROOT / "dashboard-mail-preview.html"
    preview_path.write_text(html_body, encoding="utf-8")

    if args.preview:
        print(f"Preview geschreven: {preview_path}")
        print(text)
        return

    creds = load_credentials(Path(args.token_file))
    response = send_email(creds, args.to, subject, text, html_body, DEFAULT_FROM_LABEL)
    print(f"Mail verstuurd naar {args.to}")
    print(f"Gmail message id: {response.get('id', '-')}")
    print(f"Preview opgeslagen: {preview_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Fout: {exc}", file=sys.stderr)
        sys.exit(1)
