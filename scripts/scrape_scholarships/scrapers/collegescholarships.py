"""
Scraper for collegescholarships.org - 23,000+ scholarships.
Respect robots.txt and add delays between requests.
"""
import re
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.collegescholarships.org"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def parse_amount(text: str) -> int:
    """Extract numeric amount from 'Award $25,000' or 'Award -'."""
    if not text or "-" in text:
        return 0
    match = re.search(r"\$[\d,]+", text)
    if match:
        return int(match.group().replace("$", "").replace(",", ""))
    return 0


def parse_deadline(text: str) -> str:
    """Convert 'February 28' or 'March 31' to YYYY-MM-DD. Uses current year."""
    if not text or text.lower() in ("rolling", "none", "varies"):
        return "2026-12-31"
    months = {
        "january": "01", "jan": "01", "february": "02", "feb": "02",
        "march": "03", "mar": "03", "april": "04", "apr": "04",
        "may": "05", "june": "06", "jun": "06", "july": "07", "jul": "07",
        "august": "08", "aug": "08", "september": "09", "sep": "09", "sept": "09",
        "october": "10", "oct": "10", "november": "11", "nov": "11",
        "december": "12", "dec": "12",
    }
    text = text.strip().lower()
    for name, mm in months.items():
        if name in text:
            match = re.search(r"(\d{1,2})(?:st|nd|rd|th)?", text)
            dd = match.group(1).zfill(2) if match else "01"
            return f"2026-{mm}-{dd}"
    return "2026-12-31"


def scrape_collegescholarships(max_pages: int = 5, delay_sec: float = 1.0) -> list[dict]:
    """
    Scrape scholarship listings from collegescholarships.org.
    Returns list of dicts matching ExternalScholarshipItem format.
    """
    results = []
    seen_ids = set()

    for page in range(max_pages):
        url = f"{BASE_URL}/financial-aid/" if page == 0 else f"{BASE_URL}/financial-aid/?start={page * 25}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"  Error fetching page {page + 1}: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")

        # Find scholarship blocks - typically in divs or articles
        blocks = soup.select(".scholarship-item, .result-item, article.scholarship, div.scholarship")
        if not blocks:
            # Fallback: look for blocks containing "Award" and "Deadline"
            blocks = soup.find_all(["div", "article"], class_=re.compile(r"scholarship|result|item", re.I))
        if not blocks:
            # Try splitting by common patterns in the raw HTML
            for block in soup.find_all(["div", "article", "li"]):
                text = block.get_text()
                if "Award" in text and "Deadline" in text and "More info" in text:
                    blocks = soup.find_all(block.name, recursive=False)
                    break

        # Parse: look for links to /financial-aid/scholarship/ and extract from parent/siblings
        detail_links = soup.select('a[href*="/financial-aid/scholarship/"]')
        for link in detail_links:
            href = link.get("href", "")
            slug = href.split("/scholarship/")[-1].strip("/").split("?")[0]
            if not slug or slug in seen_ids:
                continue
            if slug.startswith("sort/") or slug == "sort":
                continue

            parent = link.find_parent(["div", "article", "li", "td"])
            if not parent:
                continue
            text = parent.get_text(separator=" ", strip=True)
            if "Award" not in text or "Deadline" not in text:
                continue

            seen_ids.add(slug)
            title_el = parent.find(["h4", "h3", "h2"])
            title = title_el.get_text(strip=True) if title_el else slug.replace("-", " ").title()

            amt_match = re.search(r"Award\s*:\s*\$?([\d,]+)|Award\s+\$([\d,]+)", text, re.I)
            amount = int((amt_match.group(1) or amt_match.group(2) or "0").replace(",", "")) if amt_match else 0

            dl_match = re.search(r"Deadline\s+([A-Za-z][^.\n]*?)(?:\s+\[|$)", text)
            deadline = parse_deadline(dl_match.group(1).strip()) if dl_match else "2026-12-31"

            desc = ""
            for p in parent.find_all("p"):
                t = p.get_text(strip=True)
                if len(t) > 80 and ("Applicant" in t or "Selection" in t):
                    desc = t[:500]
                    break
            full_url = urljoin(BASE_URL, href)
            if not desc:
                desc = f"{title}. Apply at {full_url}"

            results.append({
                "id": f"collegescholarships-{slug}",
                "title": title,
                "sponsor": "CollegeScholarships.org",
                "amount": amount,
                "deadline": deadline,
                "description": desc,
            })

        # Fallback: regex over raw HTML if BeautifulSoup found nothing
        if len(results) == 0 and page == 0:
            for m in re.finditer(
                r'Award\s+\$?([\d,]*)\s+Deadline\s+([^<\n]+).*?href="([^"]*financial-aid/scholarship/([^"/?]+))"[^>]*>.*?<h[234][^>]*>([^<]+)',
                resp.text,
                re.DOTALL | re.I,
            ):
                slug = m.group(4)
                if slug in seen_ids:
                    continue
                seen_ids.add(slug)
                amount = int(m.group(1).replace(",", "")) if m.group(1) else 0
                deadline = parse_deadline(m.group(2).strip())
                url_path = m.group(3)
                title = m.group(5).strip()
                full_url = urljoin(BASE_URL, url_path) if url_path.startswith("/") else url_path
                results.append({
                    "id": f"collegescholarships-{slug}",
                    "title": title,
                    "sponsor": "CollegeScholarships.org",
                    "amount": amount,
                    "deadline": deadline,
                    "description": f"{title}. Apply at {full_url}",
                })

        print(f"  Page {page + 1}: {len(results)} total")
        time.sleep(delay_sec)

    return results
