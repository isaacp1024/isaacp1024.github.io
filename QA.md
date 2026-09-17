# Current build verification

## Site structure, layouts, and controls

`python tests/test_homepage.py` — **553 checks passed**.

Checks cover eight pages, unique element IDs, local files and anchors, shared assets,
Vision and Participate navigation, the shorter Home, retained founding thesis,
relocated core mathematics, and publication data restricted to Research.

All eight pages were rendered at 320, 360, 390, 480, 640, 760, 768, 820, 900, 1024,
1280, and 1440 pixels. No page-level horizontal overflow was detected. Expanded
snapshot calculation tables were also checked at 320px.

The mobile menu, Escape/focus restoration, outlined-link hover treatment, keyboard
focus, provider form selection, draft preparation and download, calculator ArrowUp
and ArrowDown increments, finer manual prices, invalid prices, zero usage, reset,
CSV export, timeline selection, monthly mode, and market-mix allocation were exercised.

An in-memory, test-only research fixture verified the existing publication renderer
and mobile layout. No fixture was written into the production data. No-script checks
cover navigation, mobile layout, static reference prices, and the disabled inquiry
submit control. No browser script errors or network requests were recorded in the
inlined-source suite.

## Existing mathematical and publication checks

`python tests/test_time_explorer.py` — **59 checks passed**.

Coverage includes 36 period weights, entry/exit, D's rise and decline, bounded means,
reference prices, allocation formulas, presets, time controls, invalid inputs,
CSV exports, responsive controls, and independence from the original calculator.

`python tests/test_publisher.py` — **20 tests passed**.

JavaScript syntax checks were also run on the shared script, time explorer, and data
companions. The snapshot renderer and standalone-file builder completed successfully.

## Preservation

Configuration, base styles, all canonical research and fictional scenario files,
time-explorer logic, and the publisher were compared byte-for-byte with the supplied
latest economics-refinement ZIP. They are unchanged. The standard calculator's
weighted-average formula and defaults are unchanged. Its price step and treatment
of manually entered step-mismatched decimals are the deliberate input changes.

The shared script also updates generated directional-link classes and handles old
homepage anchors. The optional standalone tools were rebuilt from current sources.

## Visual review and limits

Previews are browser screenshots of the revised HTML/CSS, not design mockups.
Component screenshots hide the sticky site header only while capturing that component;
full-page previews retain normal navigation. Each preview uses a fresh browser page.

Browser checks inline the local assets in memory. They do not verify the deployed
host, actual file:// policies on a user's browser, CDN/cache behavior, HTTPS, or an
actual inbox/endpoint. Relative-file and fragment targets are checked separately.
No live domain was modified. No real market data, financial product, or delivery offer
was introduced.

The website remains dependency-free at runtime. Browser tests require BeautifulSoup
and Playwright/Chromium; the publishing and snapshot helpers use only Python's
standard library.
