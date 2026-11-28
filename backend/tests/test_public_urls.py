from backend.core.observability.service import build_public_url


def test_public_url_rejects_credentials_and_url_controls() -> None:
    assert build_public_url("https://user:password@example.com") is None
    assert build_public_url("https://example.com\r\n.evil.test") is None
    assert build_public_url("https://example.com", "//evil.test") == "https://example.com/evil.test"


def test_public_url_joins_configured_path() -> None:
    assert build_public_url("https://example.com/monitoring/", "/graph") == (
        "https://example.com/monitoring/graph"
    )
