#!/usr/bin/env python3
"""Rebuild the optional, single-file calculator.html from the site sources.

Run with Python 3. No third-party packages are required. The benchmark page,
shared stylesheet, and shared script remain the source of truth.
"""
from html.parser import HTMLParser
from pathlib import Path

class CalculatorParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth = 0
        self.parts = []
        self.found = False

    def handle_starttag(self, tag, attrs):
        is_target = tag == "div" and dict(attrs).get("id") == "ccbt-calculator"
        if is_target:
            if self.found:
                raise ValueError("Duplicate calculator ID")
            self.found = True
            self.depth = 1
        elif self.depth and tag == "div":
            self.depth += 1
        if self.depth:
            self.parts.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if self.depth:
            self.parts.append(f"</{tag}>")
            if tag == "div":
                self.depth -= 1

    def handle_startendtag(self, tag, attrs):
        if self.depth:
            self.parts.append(self.get_starttag_text())

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)

    def handle_entityref(self, name):
        if self.depth:
            self.parts.append(f"&{name};")

    def handle_charref(self, name):
        if self.depth:
            self.parts.append(f"&#{name};")

    def handle_comment(self, data):
        if self.depth:
            self.parts.append(f"<!--{data}-->")


def main():
    root = Path(__file__).resolve().parents[1]
    page = (root / "benchmark.html").read_text(encoding="utf-8")
    parser = CalculatorParser()
    parser.feed(page)
    if not parser.found or parser.depth:
        raise ValueError("No complete #ccbt-calculator element was found")
    widget = "".join(parser.parts)
    begin, end = "<!-- BEGIN TIME EXPLORERS -->", "<!-- END TIME EXPLORERS -->"
    if page.count(begin) != 1 or page.count(end) != 1:
        raise ValueError("Expected exactly one marked time-explorer block")
    blocks = page.split(begin, 1)[1].split(end, 1)[0]
    css = "\n".join((root / path).read_text(encoding="utf-8") for path in ["styles.css", "time-explorer.css", "refinement.css"])
    js = "\n".join((root / path).read_text(encoding="utf-8") for path in ["site.js", "data/time-scenario.js", "time-explorer.js"])
    for full in [True, False]:
        first = '<section class="section" id="arithmetic"><div class="shell">' + widget + '</div></section>' if full else ""
        first_link = '<a href="#arithmetic">The calculation</a>' if full else ""
        title = "CCBT Interactive Lab" if full else "CCBT Through Time"
        filename = "calculator.html" if full else "time-explorer.html"
        document = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{title} — Standard Basis</title><meta name="description" content="A fictional three-year CCBT segment and model allocation calculator. No live market data, forecasts or executable quotes."><style>{css}</style></head><body class="sb-site">
<a href="#main" class="skip-link">Skip to content</a>
<header class="time-standalone-header"><div class="shell"><span class="brand"><span class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i></span>Standard Basis</span><nav aria-label="Explorer sections">{first_link}<a href="#through-time">Through time</a><a href="#allocate">Allocate CCBT</a></nav></div></header>
<main class="time-standalone" id="main">{first}{blocks}</main><footer class="time-standalone-footer">Standard Basis · Fictional methodology demonstrations · No live benchmark, forecast or purchase</footer><script>{js}</script></body></html>'''
        destination = root / filename
        destination.write_text(document, encoding="utf-8")
        print(f"Built {destination.name} ({destination.stat().st_size:,} bytes)")

if __name__ == "__main__":
    main()
