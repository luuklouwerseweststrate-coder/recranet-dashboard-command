from datetime import datetime, timedelta

from googleapiclient.discovery import build


def get_search_console_service(credentials):
    return build("searchconsole", "v1", credentials=credentials)


def fetch_query_performance(credentials, site_url, days=30, row_limit=5000):
    service = get_search_console_service(credentials)
    end_date = datetime.now() - timedelta(days=3)
    start_date = end_date - timedelta(days=days)

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
    end_date = datetime.now() - timedelta(days=3)
    start_date = end_date - timedelta(days=days)

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
