import pytest
from app.modules.identity.scanner import CloverScanner

@pytest.mark.asyncio
async def test_clover_scanner_initialization():
    scanner = CloverScanner()
    assert scanner.name == "clover"
    assert len(scanner.sites) >= 50
    assert any("github" in s["name"].lower() for s in scanner.sites)
    assert any("reddit" in s["name"].lower() for s in scanner.sites)

@pytest.mark.asyncio
async def test_clover_scanner_execution():
    scanner = CloverScanner()
    # Test with popular_only=True and limited concurrency
    results = []
    async for probe in scanner.run("google", {"popular_only": True, "concurrency": 5, "timeout": 3.0}):
        results.append(probe)
        if len(results) >= 5:
            break
    for r in results:
        assert r.platform != ""
        assert r.url.startswith("http")

def test_clover_metadata_unescape():
    scanner = CloverScanner()
    html_content = """
    <html>
      <head>
        <meta property="og:title" content="&#x905;&#x92e;&#x932;&#x1f9a9; - GitHub" />
        <meta property="og:description" content="Check out &#064;amaleiy._ on &quot;GitHub&quot; &amp; more" />
      </head>
      <body></body>
    </html>
    """
    meta = scanner._extract_profile_metadata(html_content, "text/html", "https://github.com/amaleiy._")
    # Title must be decoded from &#x905;&#x92e;&#x932;&#x1f9a9; to Amal 🦩
    assert "अमल" in meta["display_name"]
    assert "amaleiy._" in meta["bio"]
    assert '"GitHub" & more' in meta["bio"]

def test_clover_bot_challenge_detection():
    scanner = CloverScanner()
    assert scanner._is_bot_challenge("<title>Client Challenge</title>", 200) is True
    assert scanner._is_bot_challenge("Just a moment...", 403) is True
    assert scanner._is_bot_challenge("<html><title>Normal Profile</title></html>", 200) is False
