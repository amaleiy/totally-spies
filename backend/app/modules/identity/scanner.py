import asyncio
import html
import json
import os
import re
import time
from typing import AsyncGenerator, Dict, Any, List, Optional
import httpx

from app.modules.base import BaseScannerModule, ProbeResult
from app.core.rate_limiter import AsyncRateLimiter

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]

BOT_CHALLENGE_SIGNATURES = [
    "client challenge",
    "just a moment",
    "attention required",
    "access denied",
    "robot or human",
    "<title>client challenge",
    "<title>just a moment",
    "<title>attention required",
    "<title>access denied",
    "<title>robot or human",
    "cf-browser-verification",
    "attention required! | cloudflare",
    "checking your browser before accessing",
    "ddos-guard",
    "security check to continue",
    "enable javascript and cookies to continue",
    "challenges.cloudflare.com",
    "ray id:"
]

INVALID_PAGE_TITLES = {
    "client challenge",
    "just a moment...",
    "attention required!",
    "access denied",
    "users",
    "search",
    "search users",
    "page not found",
    "404 not found",
    "error 404",
    "sign in",
    "login"
}

POPULAR_PLATFORMS = {
    "github", "gitlab", "reddit", "telegram", "steam", "dockerhub",
    "keybase", "pastebin", "deviantart", "hackernews", "disqus",
    "soundcloud", "replit", "chess.com", "chess", "producthunt", "medium",
    "linktree", "buymeacoffee", "gravatar", "bandcamp", "pypi",
    "npm", "pinterest", "vimeo", "kaggle", "mastodon"
}

class CloverScanner(BaseScannerModule):
    """Module A: Identity & Username Enumeration ('Clover') - Multi-Engine OSINT Intelligence."""

    def __init__(self):
        base_dir = os.path.dirname(__file__)
        self.wmn_file = os.path.join(base_dir, "wmn-data.json")
        self.sherlock_file = os.path.join(base_dir, "sherlock-data.json")
        self.sites_file = os.path.join(base_dir, "sites.json")

        self.wmn_sites: List[Dict[str, Any]] = []
        self.sherlock_sites: List[Dict[str, Any]] = []

        self._load_datasets()
        # Default active sites
        self.sites = self.wmn_sites or self.sherlock_sites

    def _load_datasets(self):
        # 1. Load WhatsMyName
        if os.path.exists(self.wmn_file):
            try:
                with open(self.wmn_file, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    self.wmn_sites = [
                        s for s in raw_data.get("sites", [])
                        if s.get("cat") != "xx NSFW xx" and s.get("cat") != "archived"
                    ]
            except Exception as e:
                print(f"Warning: Failed to load WMN data: {e}")

        # 2. Load Sherlock
        if os.path.exists(self.sherlock_file):
            try:
                with open(self.sherlock_file, "r", encoding="utf-8") as f:
                    raw_sherlock = json.load(f)
                    converted = []
                    for name, meta in raw_sherlock.items():
                        if name.startswith("$"):
                            continue
                        uri_check = meta.get("urlProbe", meta.get("url", ""))
                        uri_pretty = meta.get("url", uri_check)
                        err_type = meta.get("errorType", "status_code")
                        err_msg = meta.get("errorMsg")
                        
                        site_entry = {
                            "name": name,
                            "uri_check": uri_check.replace("{}", "{account}"),
                            "uri_pretty": uri_pretty.replace("{}", "{account}"),
                            "cat": "general",
                            "regex_check": meta.get("regexCheck"),
                            "headers": meta.get("headers", {}),
                            "engine": "sherlock"
                        }
                        if err_type == "status_code":
                            site_entry["e_code"] = 200
                            site_entry["m_code"] = 404
                        elif err_type == "message":
                            site_entry["e_code"] = 200
                            if isinstance(err_msg, list):
                                site_entry["m_string_list"] = err_msg
                            elif isinstance(err_msg, str):
                                site_entry["m_string"] = err_msg
                        elif err_type == "response_url":
                            site_entry["e_code"] = 200
                            site_entry["error_url"] = meta.get("errorUrl")

                        converted.append(site_entry)
                    self.sherlock_sites = converted
            except Exception as e:
                print(f"Warning: Failed to load Sherlock data: {e}")

    @property
    def name(self) -> str:
        return "clover"

    @property
    def description(self) -> str:
        return "Multi-engine identity enumeration supporting WhatsMyName (700+ sites) and Sherlock (480+ sites)."

    def _is_bot_challenge(self, body_text: str, status_code: int) -> bool:
        body_lower = body_text.lower()
        return any(sig in body_lower for sig in BOT_CHALLENGE_SIGNATURES)

    def _is_redirected_away(self, target_username: str, initial_url: str, final_url: str) -> bool:
        initial_clean = initial_url.split("?")[0].rstrip("/")
        final_clean = final_url.split("?")[0].rstrip("/")

        if initial_clean == final_clean:
            return False

        parsed_final = httpx.URL(final_url)
        if parsed_final.path in ["", "/", "/login", "/home", "/explore", "/search", "/users/sign_in"]:
            return True

        if not initial_url.endswith(".json") and "api" not in initial_url:
            if target_username.lower() not in parsed_final.path.lower():
                return True

        return False

    def _extract_profile_metadata(self, resp_text: str, content_type: str, url: str) -> Dict[str, Any]:
        """Extracts display name, avatar, bio, and location from HTML OpenGraph or JSON headers."""
        meta: Dict[str, Any] = {}
        if "text/html" in content_type:
            # Display Name / Title
            title_match = (
                re.search(r'<meta\s+(?:property|name)=["\']og:title["\']\s+content=["\'](.*?)["\']', resp_text, re.I) or
                re.search(r'<title>(.*?)</title>', resp_text, re.I)
            )
            if title_match:
                clean_title = title_match.group(1).strip()
                # Remove common brand suffixes
                clean_title = re.sub(r'\s*[-|•·]\s*(?:GitHub|GitLab|Reddit|Steam|Pinterest|Medium|SoundCloud).*$', '', clean_title, flags=re.I).strip()
                clean_title = html.unescape(clean_title)
                if clean_title:
                    meta["display_name"] = clean_title

            # Bio / Description
            desc_match = re.search(
                r'<meta\s+(?:property|name)=["\'](?:og:description|description)["\']\s+content=["\'](.*?)["\']',
                resp_text, re.I
            )
            if desc_match:
                bio_text = desc_match.group(1).strip()
                bio_text = html.unescape(bio_text)
                if bio_text and len(bio_text) > 3 and not self._is_bot_challenge(bio_text, 200):
                    meta["bio"] = bio_text

            # Avatar URL
            img_match = re.search(
                r'<meta\s+(?:property|name)=["\']og:image["\']\s+content=["\'](.*?)["\']',
                resp_text, re.I
            )
            if img_match:
                avatar = img_match.group(1).strip()
                if avatar.startswith("http"):
                    meta["avatar_url"] = avatar

        elif "json" in content_type:
            try:
                data = json.loads(resp_text)
                if isinstance(data, dict):
                    # Check common JSON profile fields
                    for name_field in ["name", "username", "display_name", "full_name"]:
                        if data.get(name_field):
                            meta["display_name"] = str(data[name_field])
                            break
                    for bio_field in ["bio", "description", "about"]:
                        if data.get(bio_field):
                            meta["bio"] = str(data[bio_field])
                            break
                    for loc_field in ["location", "city", "country"]:
                        if data.get(loc_field):
                            meta["location"] = str(data[loc_field])
                            break
                    for avatar_field in ["avatar", "avatar_url", "image", "icon"]:
                        if data.get(avatar_field) and str(data[avatar_field]).startswith("http"):
                            meta["avatar_url"] = str(data[avatar_field])
                            break
            except Exception:
                pass

        return meta

    async def _probe_site(
        self,
        client: httpx.AsyncClient,
        limiter: AsyncRateLimiter,
        site: Dict[str, Any],
        username: str,
        timeout: float = 7.0
    ) -> ProbeResult:
        platform = site.get("name", "Unknown")
        category = site.get("cat", "general")
        engine_source = site.get("engine", "whatsmyname")
        
        uri_check = site.get("uri_check", site.get("url", ""))
        uri_pretty = site.get("uri_pretty", uri_check)
        check_url = uri_check.replace("{account}", username).replace("{}", username)
        display_url = uri_pretty.replace("{account}", username).replace("{}", username)

        # 1. Syntax Regex Check
        regex = site.get("regex_check")
        if regex:
            try:
                if not re.search(regex, username):
                    return ProbeResult(
                        platform=platform,
                        url=display_url,
                        is_match=False,
                        error="Username syntax rejected by platform pattern",
                        metadata={"category": category, "engine": engine_source, "validation": "regex_rejected"}
                    )
            except Exception:
                pass

        headers = {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Linux"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1"
        }
        # Platform-specific custom headers if defined
        if "headers" in site and isinstance(site["headers"], dict):
            headers.update(site["headers"])

        start_time = time.monotonic()
        try:
            async with limiter:
                resp = await client.get(
                    check_url,
                    headers=headers,
                    timeout=timeout,
                    follow_redirects=True
                )
                elapsed = round(time.monotonic() - start_time, 2)
                resp_text = resp.text
                final_url = str(resp.url)
                content_type = resp.headers.get("content-type", "")

                # 2. Check for Bot Challenge
                if self._is_bot_challenge(resp_text, resp.status_code):
                    return ProbeResult(
                        platform=platform,
                        url=display_url,
                        is_match=False,
                        status_code=resp.status_code,
                        response_time=elapsed,
                        error="Protected by Cloudflare / Bot Challenge",
                        metadata={"category": category, "engine": engine_source, "blocked": True}
                    )

                # 3. Check for Redirect Away
                if self._is_redirected_away(username, check_url, final_url):
                    return ProbeResult(
                        platform=platform,
                        url=display_url,
                        is_match=False,
                        status_code=resp.status_code,
                        response_time=elapsed,
                        metadata={"category": category, "engine": engine_source, "redirected_to": final_url}
                    )

                # 4. Evaluation
                e_code = site.get("e_code", 200)
                m_code = site.get("m_code")
                e_str = site.get("e_string")
                m_str = site.get("m_string")
                m_str_list = site.get("m_string_list", [])

                is_match = False

                if e_str:
                    is_match = (e_str in resp_text and resp.status_code == e_code)
                elif m_str_list:
                    is_match = (all(ms not in resp_text for ms in m_str_list) and resp.status_code == e_code)
                elif m_str:
                    is_match = (m_str not in resp_text and resp.status_code == e_code)
                elif m_code:
                    is_match = (resp.status_code != m_code and resp.status_code == e_code)
                else:
                    is_match = (resp.status_code == e_code)

                # 5. Safeguard for Query/Search URLs (e.g., greasyfork ?q=...)
                if is_match and ("?q=" in check_url or "/search" in check_url or "?query=" in check_url):
                    if username.lower() not in resp_text.lower():
                        is_match = False

                # 6. Extract Rich Profile Metadata if Match
                metadata = {
                    "category": category,
                    "engine": engine_source,
                    "status_code": resp.status_code,
                    "response_time": elapsed,
                    "verified_by": "e_string" if e_str else "m_string" if (m_str or m_str_list) else "status_code"
                }

                if is_match:
                    extracted = self._extract_profile_metadata(resp_text, content_type, final_url)
                    # Check if extracted title is a known generic error / challenge
                    disp_name = (extracted.get("display_name") or "").lower().strip()
                    if disp_name in INVALID_PAGE_TITLES or any(b in disp_name for b in ["client challenge", "just a moment", "access denied", "attention required"]):
                        is_match = False
                    else:
                        metadata.update(extracted)

                return ProbeResult(
                    platform=platform,
                    url=display_url,
                    is_match=is_match,
                    status_code=resp.status_code,
                    response_time=elapsed,
                    metadata=metadata
                )

        except httpx.TimeoutException:
            elapsed = round(time.monotonic() - start_time, 2)
            return ProbeResult(
                platform=platform,
                url=display_url,
                is_match=False,
                response_time=elapsed,
                error="Connection timed out",
                metadata={"category": category, "engine": engine_source}
            )
        except Exception as e:
            elapsed = round(time.monotonic() - start_time, 2)
            return ProbeResult(
                platform=platform,
                url=display_url,
                is_match=False,
                response_time=elapsed,
                error=str(e),
                metadata={"category": category, "engine": engine_source}
            )

    async def run(
        self,
        target_value: str,
        config: Dict[str, Any]
    ) -> AsyncGenerator[ProbeResult, None]:
        concurrency = config.get("concurrency", 20)
        timeout = config.get("timeout", 7.0)
        engine_type = config.get("engine", "whatsmyname").lower()
        category_filter = config.get("category")
        popular_only = config.get("popular_only", False)

        # Select Dataset
        if "sites" in config and config["sites"] is not None:
            candidates = list(config["sites"])
        elif engine_type == "sherlock":
            candidates = self.sherlock_sites
        elif engine_type == "merged":
            seen_names = set()
            candidates = []
            for s in (self.wmn_sites + self.sherlock_sites):
                lower_name = s.get("name", "").lower()
                if lower_name not in seen_names:
                    seen_names.add(lower_name)
                    candidates.append(s)
        else:
            candidates = self.wmn_sites

        # Specific platforms list
        if config.get("platforms"):
            target_plats = [p.lower() for p in config["platforms"]]
            candidates = [s for s in candidates if s.get("name", "").lower() in target_plats]

        # Filter scope
        if popular_only:
            candidates = [s for s in candidates if any(p in s.get("name", "").lower() for p in POPULAR_PLATFORMS)]
        elif category_filter and category_filter != "all":
            candidates = [s for s in candidates if s.get("cat", "").lower() == category_filter.lower()]

        limiter = AsyncRateLimiter(max_concurrent=concurrency, delay_between_requests=0.03)

        async with httpx.AsyncClient(verify=False) as client:
            tasks = [
                self._probe_site(client, limiter, site, target_value, timeout=timeout)
                for site in candidates
            ]
            for future in asyncio.as_completed(tasks):
                result = await future
                yield result
