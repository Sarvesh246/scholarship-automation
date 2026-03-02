# Scholarship Web Scraper

Scrape scholarships from the web and import them into ApplyPilot.

## Setup

```bash
cd scripts/scrape_scholarships
pip install -r requirements.txt
```

## Usage

### 1. Scrape and save to JSON

```bash
python main.py -o scraped.json
```

### 2. Scrape with options

```bash
python main.py -o scraped.json --max-pages 10 --delay 2
```

- `--max-pages N` – Max pages to scrape per site (default: 5)
- `--delay N` – Seconds between requests (default: 1, use 2+ to be polite)
- `--site collegescholarships` – Scrape only collegescholarships.org
- `--site all` – Scrape all configured sites (default)

### 3. Import directly into ApplyPilot

1. Log in to your app as an admin.
2. Open browser DevTools → Application → Local Storage (or get your Firebase ID token another way).
3. Run:

```bash
python main.py --post http://localhost:3000 --token YOUR_FIREBASE_ID_TOKEN
```

For production, use your deployed URL:

```bash
python main.py --post https://your-app.vercel.app --token YOUR_TOKEN
```

## Sites

| Site | Description |
|------|-------------|
| **collegescholarships.org** | 23,000+ scholarships, well-structured HTML |

## Adding a new scraper

1. Create `scrapers/mysite.py` with a `scrape_mysite(max_pages, delay_sec)` function.
2. Return a list of dicts matching this shape:

```python
{
    "id": "unique-id",           # optional, will slugify title if missing
    "title": "Scholarship Name",
    "sponsor": "Organization",
    "amount": 5000,              # 0 if unknown
    "deadline": "2026-12-31",    # YYYY-MM-DD
    "description": "...",
}
```

3. Add your scraper to `main.py` and wire it into the `--site` choices.

## Etiquette

- Respect `robots.txt` and site terms of service.
- Use `--delay 2` or higher to avoid overloading servers.
- Don't scrape sites that prohibit it.
