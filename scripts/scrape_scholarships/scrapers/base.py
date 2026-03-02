"""
Base utilities and a generic config-driven scraper for custom sites.
"""
import json
import re
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url: str, headers: dict | None = None) -> str:
    """Fetch HTML from URL."""
    resp = requests.get(url, headers=headers or DEFAULT_HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.text


def parse_amount(text: str) -> int:
    """Extract numeric amount from text like '$25,000' or '25000'."""
    if not text:
        return 0
    match = re.search(r"[\$]?\s*([\d,]+)", str(text))
    if match:
        return int(match.group(1).replace(",", ""))
    return 0


def parse_deadline_to_iso(text: str) -> str:
    """Convert common date formats to YYYY-MM-DD."""
    if not text or not str(text).strip():
        return "2026-12-31"
    text = str(text).strip().lower()
    if text in ("rolling", "none", "varies", "tbd"):
        return "2026-12-31"
    months = {
        "jan": "01", "january": "01", "feb": "02", "february": "02",
        "mar": "03", "march": "03", "apr": "04", "april": "04",
        "may": "05", "jun": "06", "june": "06", "jul": "07", "july": "07",
        "aug": "08", "august": "08", "sep": "09", "sept": "09", "september": "09",
        "oct": "10", "october": "10", "nov": "11", "november": "11",
        "dec": "12", "december": "12",
    }
    for name, mm in months.items():
        if name in text:
            match = re.search(r"(\d{1,2})(?:st|nd|rd|th)?", text)
            dd = match.group(1).zfill(2) if match else "01"
            return f"2026-{mm}-{dd}"
    # Try MM/DD/YYYY or YYYY-MM-DD
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return m.group(0)
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if m:
        return f"{m.group(3)}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}"
    return "2026-12-31"


def generic_scrape(config: dict, max_pages: int = 3, delay_sec: float = 1.0) -> list[dict]:
    """
    Scrape using config-driven selectors.
    Config format:
    {
      "base_url": "https://example.com",
      "list_url": "https://example.com/scholarships",
      "pagination": "?page={page}",  // optional
      "item_selector": ".scholarship-card",
      "title_selector": "h3",
      "amount_selector": ".amount",
      "deadline_selector": ".deadline",
      "description_selector": "p",
      "link_selector": "a.apply",
      "sponsor": "Example Site"
    }
    """
    results = []
    base = config.get("base_url", "")
    list_url = config.get("list_url", base)
    item_sel = config.get("item_selector", "article, .scholarship, .card")
    title_sel = config.get("title_selector", "h1, h2, h3, h4")
    amount_sel = config.get("amount_selector", "")
    deadline_sel = config.get("deadline_selector", "")
    desc_sel = config.get("description_selector", "p")
    link_sel = config.get("link_selector", "a")
    sponsor = config.get("sponsor", "Unknown")

    for page in range(max_pages):
        url = list_url
        if config.get("pagination"):
            url = list_url + config["pagination"].format(page=page + 1)
        elif page > 0:
            url = f"{list_url}?page={page + 1}"

        try:
            html = fetch(url)
        except requests.RequestException as e:
            print(f"  Error: {e}")
            break

        soup = BeautifulSoup(html, "html.parser")
        items = soup.select(item_sel)
        if not items:
            break

        for item in items:
            title_el = item.select_one(title_sel)
            title = title_el.get_text(strip=True) if title_el else ""
            if not title:
                continue

            link_el = item.select_one(link_sel)
            href = link_el.get("href", "") if link_el else ""
            full_url = urljoin(base, href) if href else ""

            amount = 0
            if amount_el := item.select_one(amount_sel):
                amount = parse_amount(amount_el.get_text())

            deadline = "2026-12-31"
            if deadline_el := item.select_one(deadline_sel):
                deadline = parse_deadline_to_iso(deadline_el.get_text())

            desc_el = item.select_one(desc_sel)
            desc = desc_el.get_text(strip=True)[:500] if desc_el else ""
            if not desc and full_url:
                desc = f"{title}. Apply at {full_url}"

            slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]
            results.append({
                "id": f"scraped-{slug}-{hash(href or title) % 100000}",
                "title": title,
                "sponsor": sponsor,
                "amount": amount,
                "deadline": deadline,
                "description": desc,
            })

        time.sleep(delay_sec)

    return results
