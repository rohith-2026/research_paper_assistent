# app/utils/links.py
import urllib.parse


def google_scholar_search_url(title: str) -> str:
    q = urllib.parse.quote_plus(title.strip())
    return f"https://scholar.google.com/scholar?q={q}"
