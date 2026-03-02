#!/usr/bin/env python3
"""
Scholarship web scraper - outputs JSON for bulk import into ApplyPilot.

Usage:
  python main.py                          # Run default scrapers, output to stdout
  python main.py -o scraped.json          # Save to file
  python main.py --post http://localhost:3000  # POST to bulk import API (requires auth)

Output format matches ExternalScholarshipItem for sync compatibility.
"""
import argparse
import json
import sys
from pathlib import Path

# Add scrapers to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from scrapers.collegescholarships import scrape_collegescholarships


def main():
    parser = argparse.ArgumentParser(description="Scrape scholarships from the web")
    parser.add_argument("-o", "--output", help="Output JSON file path")
    parser.add_argument("--max-pages", type=int, default=5, help="Max pages per site (default: 5)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests in seconds")
    parser.add_argument(
        "--post",
        metavar="BASE_URL",
        help="POST results to /api/admin/scholarships/bulk (e.g. http://localhost:3000). Requires admin auth token via --token.",
    )
    parser.add_argument("--token", help="Firebase ID token for --post (get from browser dev tools when logged in as admin)")
    parser.add_argument("--site", choices=["collegescholarships", "all"], default="all", help="Which site to scrape")
    args = parser.parse_args()

    all_results = []

    if args.site in ("collegescholarships", "all"):
        print("Scraping collegescholarships.org...")
        items = scrape_collegescholarships(max_pages=args.max_pages, delay_sec=args.delay)
        all_results.extend(items)
        print(f"  Got {len(items)} scholarships")

    # Dedupe by id
    seen = set()
    unique = []
    for r in all_results:
        kid = r.get("id") or r.get("title", "")
        if kid not in seen:
            seen.add(kid)
            unique.append(r)

    print(f"\nTotal: {len(unique)} unique scholarships")

    if args.post:
        if not args.token:
            print("Error: --post requires --token (Firebase ID token)", file=sys.stderr)
            sys.exit(1)
        base = args.post.rstrip("/")
        url = f"{base}/api/admin/scholarships/bulk"
        import urllib.request
        data = json.dumps({"scholarships": unique}).encode()
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {args.token}")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode())
                print(f"Posted: {result.get('created', 0)} created, {result.get('updated', 0)} updated")
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            print(f"POST failed {e.code}: {body}", file=sys.stderr)
            sys.exit(1)
    elif args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(unique, f, indent=2, ensure_ascii=False)
        print(f"Saved to {args.output}")
    else:
        print(json.dumps(unique, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
