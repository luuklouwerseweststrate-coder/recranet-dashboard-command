import argparse
import json
from datetime import datetime

from google_auth import get_credentials
from google_ga4_client import fetch_internal_searches
from google_search_console_client import (
    fetch_page_performance,
    fetch_query_performance,
    fetch_site_totals,
    get_search_console_date_range,
)


def main():
    parser = argparse.ArgumentParser(description="Fetch live Google snapshot for dashboard backend")
    parser.add_argument("--site-url", required=True)
    parser.add_argument("--property-id", required=True)
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    creds = get_credentials()
    start_date, end_date = get_search_console_date_range(args.days)
    start_date_label = start_date.strftime("%Y-%m-%d")
    end_date_label = end_date.strftime("%Y-%m-%d")
    queries = fetch_query_performance(creds, args.site_url, days=args.days, row_limit=25)
    pages = fetch_page_performance(creds, args.site_url, days=args.days, row_limit=15)
    totals = fetch_site_totals(creds, args.site_url, days=args.days)
    internal_searches = fetch_internal_searches(
        creds,
        args.property_id,
        days=args.days,
        start_date=start_date_label,
        end_date=end_date_label,
    )

    payload = {
        "ok": True,
        "source": "google",
        "siteUrl": args.site_url,
        "propertyId": args.property_id,
        "days": args.days,
        "fetchedAt": datetime.now().isoformat(),
        "period": {
            "startDate": start_date_label,
            "endDate": end_date_label,
            "label": f"{start_date_label} t/m {end_date_label}",
            "note": "Search Console-data loopt meestal enkele dagen achter; GA4 is voor dezelfde periode opgehaald.",
        },
        "searchConsole": {
            "queries": queries,
            "pages": pages,
            "totals": totals,
        },
        "ga4": {
            "internalSearches": internal_searches[:25],
            "totalInternalSearches": sum(item["count"] for item in internal_searches),
        },
    }

    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        raise
