from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, OrderBy, RunReportRequest


def fetch_internal_searches(credentials, property_id, days=30, start_date=None, end_date=None):
    client = BetaAnalyticsDataClient(credentials=credentials)
    date_range = DateRange(
        start_date=start_date or f"{days}daysAgo",
        end_date=end_date or "today",
    )

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="searchTerm")],
        metrics=[Metric(name="eventCount")],
        date_ranges=[date_range],
        order_bys=[
            OrderBy(metric=OrderBy.MetricOrderBy(metric_name="eventCount"), desc=True),
        ],
        limit=10000,
    )

    response = client.run_report(request)
    search_terms = []

    for row in response.rows:
        term = row.dimension_values[0].value
        count = int(row.metric_values[0].value)

        if not term or term in ["(not set)", "(other)"]:
            continue

        search_terms.append({"term": term.strip().lower(), "count": count})

    return search_terms
