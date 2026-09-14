from datetime import datetime, timedelta

from googleapiclient.discovery import build


def get_search_console_service(credentials):
    return build("searchconsole", "v1", credentials=credentials)


def get_search_console_date_range(days=30):
    end_date = datetime.now().date() - timedelta(days=3)
    start_date = end_date - timedelta(days=max(days - 1, 0))
    return start_date, end_date


def fetch_site_totals(credentials, site_url, days=30):
    service = get_search_console_service(credentials)
    start_date, end_date = get_search_console_date_range(days)

    response = (
        service.searchanalytics()
        .query(
            siteUrl=site_url,
            body={
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
                "rowLimit": 1,
                "startRow": 0,
            },
        )
        .execute()
    )

    rows = response.get("rows", [])
    if not rows:
        return {
            "clicks": 0,
            "impressions": 0,
            "ctr": 0,
            "position": 0,
        }

    row = rows[0]
    return {
        "clicks": row.get("clicks", 0),
        "impressions": row.get("impressions", 0),
        "ctr": round(row.get("ctr", 0) * 100, 2),
        "position": round(row.get("position", 0), 1),
    }


def fetch_query_performance(credentials, site_url, days=30, row_limit=5000):
    service = get_search_console_service(credentials)
    start_date, end_date = get_search_console_date_range(days)

    response = (
        service.searchanalytics()
        .query(
            siteUrl=site_url,
            body={
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
                "dimensions": ["query"],
                "rowLimit": row_limit,
                "startRow": 0,
            },
        )
        .execute()
    )

    return [
        {
            "query": row["keys"][0],
            "clicks": row["clicks"],
            "impressions": row["impressions"],
            "ctr": round(row["ctr"] * 100, 2),
            "position": round(row["position"], 1),
        }
        for row in response.get("rows", [])
    ]


def fetch_page_performance(credentials, site_url, days=30, row_limit=1000):
    service = get_search_console_service(credentials)
    start_date, end_date = get_search_console_date_range(days)

    response = (
        service.searchanalytics()
        .query(
            siteUrl=site_url,
            body={
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
                "dimensions": ["page"],
                "rowLimit": row_limit,
                "startRow": 0,
            },
        )
        .execute()
    )

    return [
        {
            "page": row["keys"][0],
            "clicks": row["clicks"],
            "impressions": row["impressions"],
            "ctr": round(row["ctr"] * 100, 2),
            "position": round(row["position"], 1),
        }
        for row in response.get("rows", [])
    ]
