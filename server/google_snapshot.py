import argparse
import json

from google_auth import get_credentials
from google_ga4_client import fetch_internal_searches
from google_search_console_client import fetch_page_performance, fetch_query_performance


def main():
    parser = argparse.ArgumentParser(description="Fetch live Google snapshot for dashboard backend")
    parser.add_argument("--site-url", required=True)
    parser.add_argument("--property-id", required=True)
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    creds = get_credentials()
    queries = fetch_query_performance(creds, args.site_url, days=args.days, row_limit=25)
    pages = fetch_page_performance(creds, args.site_url, days=args.days, row_limit=15)
    internal_searches = fetch_internal_searches(creds, args.property_id, days=args.days)

    payload = {
        "ok": True,
        "source": "google",
        "siteUrl": args.site_url,
        "propertyId": args.property_id,
        "days": args.days,
        "searchConsole": {
            "queries": queries,
            "pages": pages,
            "totals": {
                "clicks": sum(item["clicks"] for item in queries),
                "impressions": sum(item["impressions"] for item in queries),
            },
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
