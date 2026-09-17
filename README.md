# Standard Basis — current website package

The homepage is now **the problem → the concept → our proposal → a directory**.
Longer company and buyer/provider applications live on **Vision**. The plain-English
common-basis construction is on **CCBT**; the full inquiry has its own **Participate** page.
The original thesis remains available as a supporting paper linked from Vision.

The two-date visual compares the opening and closing fictional markets with their own
CCBT reference prices underneath. It is shared by Vision and Market. No large contracted
quantity sits between the two prices. Directional links are outlined controls that turn
black on hover or keyboard focus. The interactive model-price steppers use **$0.10**.

Read **`SITE-REFINEMENT.md`** for the current upgrade instructions. Earlier update notes
are retained as revision history, not current deployment instructions.

Eight site pages, plus two optional standalone tools. No frontend framework, package
manager, external fonts, chart library, database, or API key is required to run the site.
All production HTML, CSS, and JavaScript files are already built.

## Open it

Unzip the package and open `index.html` in a browser. Keep the directory together:
the pages share stylesheets, JavaScript, and configuration. Research data is loaded only on `research.html`.

You can also serve it from the folder with:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. A web server is optional for the
static preview; a real inquiry endpoint requires a deployed/served site.

## What is included

| File | Purpose |
| --- | --- |
| `index.html` | Problem → abstract concept → named proposal → six-destination directory |
| `vision.html` | Company, buyer/provider applications, two-date reference comparison, development path, founding thesis |
| `participate.html` | Existing configurable buyer/provider/research inquiry and draft controls |
| `market.html` | Procurement process, buyer/provider paths, fictional offer comparison, future consumption |
| `benchmark.html` | CCBT in Practice: core model, original interactive calculation, timeline, and allocation |
| `research.html` | Pre-publication placeholder; validated market observations, source/composition/history views, implementation notes |
| `ccbt.html` | Plain-English common denominator and math, followed by the retained general methodology |
| `thesis.html` | Retained founding thesis, linked from Vision rather than the primary navigation |
| `styles.css` | Shared visual identity, original calculator styling, responsive layouts |
| `home.css` | Existing homepage role cards and practice-navigation styling |
| `narrative.css` | Existing narrative, mathematics, and Research layouts |
| `refinement.css` | Required final stylesheet: link controls, shorter Home, Vision, two-date comparison |
| `time-explorer.css` / `time-explorer.js` | Existing timeline and allocation tools |
| `data/time-scenario.js` / `.json` | Unchanged fictional market scenario |
| `calculator.html` / `time-explorer.html` | Optional single-file interactive tools, regenerated from the integrated sources |
| `site.js` | Navigation, charts, calculation, validation, CSV export, inquiry drafts and optional delivery |
| `site-config.js` | Receiving address, optional endpoint, optional founder information |
| `favicon.svg` | Small geometric brand mark |
| `data/benchmark.json` | Canonical research data; initially contains **no observations** |
| `data/benchmark.js` | Generated browser-readable copy of the canonical JSON |
| `data/observation-template.json` | Incomplete template to fill with actual research inputs; not loaded by the site |
| `scripts/publish_benchmark.py` | Validates research inputs and publishes the browser file atomically |
| `scripts/build_snapshots.py` | Rebuilds static two-date visuals from the existing fictional scenario |
| `scripts/build_calculator.py` | Rebuilds the two optional standalone interactive tools |
| `tests/test_publisher.py` | 20 standard-library tests; fictional test fixtures are not website data |
| `QA.md` | Checks performed and their limitations |

The substantive sections of the supplied CCBT and thesis HTML were retained.
The new procurement comparison and calculator are explicitly illustrative.

## Before putting it on your public domain

The live inquiry is now on `participate.html`; its configuration and delivery behavior are unchanged.

### 1. Set the receiving address

Open `site-config.js` and set `contactEmail` to an address you control. Do not leave
an example address in the public site.

```js
window.SB_CONFIG = Object.freeze({
  contactEmail: "",     // Replace with your actual receiving address.
  inquiryEndpoint: "",
  founder: { name: "", bio: "", profileUrl: "" }
});
```

With a valid receiving address, the form button becomes **Open email draft**.
It prepares a populated message in the visitor's email application. The visitor
reviews and sends it there. The website does not claim that opening a draft sends
an email. A direct email link also becomes visible.

With neither an email address nor an endpoint configured, the form is deliberately
a **local draft tool**: it prepares, copies, and saves an inquiry, and says plainly
that nothing has been sent. No recipient was supplied with the source files, so no
address has been guessed. Configure and test this before promoting the site.

The buyer/provider links select the appropriate inquiry type. Research has its own
route through the same form. No draft is stored in localStorage or transmitted in
the background.

### 2. Optionally connect server-side inquiry delivery

A real backend is **not** bundled. To use your own existing receiving service, set
`inquiryEndpoint` to an HTTPS endpoint (or a same-origin `/api/...` route when the
site is served). This mode takes priority over the email-draft mode.

On an explicit form submission, the client sends a JSON POST containing:

```json
{
  "name": "Visitor name",
  "email": "Visitor email",
  "company": "Organization or empty string",
  "role": "buyer",
  "message": "The visitor's description",
  "website": ""
}
```

`role` is one of `buyer`, `provider`, `research`, or `other`. `website` is an empty
honeypot. The receiving service must perform its own validation, abuse controls,
rate limiting, and privacy/security handling. The browser does not send cookies or
credentials. A cross-origin endpoint must permit the appropriate CORS request.
Private API keys must remain server-side, never in `site-config.js`.

The endpoint must return a successful HTTP status **and** JSON `{"ok": true}` after
accepting the inquiry. Only then does the UI confirm receipt. Failure, malformed
responses, redirects, and a 15-second timeout retain the draft and say receipt was
not confirmed. This client integration was exercised with mocked responses only;
no live receiving service was connected or tested.

### 3. Add actual founder information

Populate `founder.name`, `founder.bio`, and optionally `founder.profileUrl` in the
same configuration file. The founder block stays hidden until a name is supplied.
It renders plain text, not arbitrary HTML. No biography or credentials were invented.

### 4. Review your public information-handling practice

The initial form asks for high-level descriptions and warns against submitting
sensitive data or credentials. Before collecting detailed requirements or provider
quotes, decide and disclose your actual confidentiality, retention, access, and
benchmark-use practices. The static form does not automatically turn inquiries into
benchmark inputs. No analytics or marketing trackers are included.

## The benchmark: no live feed required

The initial publication panel is a designed pre-publication state, not a pretend
market chart. The separate interactive calculator starts with three fictional
models. Its numbers never enter the research data file or the published series.
The procurement comparison on `market.html` is also fictional and explicitly labeled.

The publication path is:

**Collect actual inputs → review them → update one JSON file → validate/publish → upload.**

Only `research.html` loads `data/benchmark.js`. Both the publication panel and its implementation notes live there. The homepage and In Practice page show the general model, not publication states. There are no visitor-time requests to model providers. A later collector can populate the same JSON without changing the website.

### Publish a first observation

1. Define the specific qualifying market, methodology version, price basis, and
   pricing convention in `data/benchmark.json`. Replace the pre-publication text.
2. Fill `data/observation-template.json` with an actual observation. All empty/null
   fields are deliberately invalid for publication. Do not use the fictional test
   fixtures as market data.
3. Append the completed object to the `observations` array in `benchmark.json`.
4. From the website folder, run:

```sh
python3 scripts/publish_benchmark.py --check
python3 scripts/publish_benchmark.py
```

Python 3.10 or newer is sufficient. There are no Python package dependencies for
the publisher or its unit tests. The script reads the JSON, validates it, and
atomically replaces `data/benchmark.js`. It does not fetch market data, infer an
input/output ratio, choose weights, or automatically change observation timestamps.
An invalid update leaves the previous browser file untouched.

Upload the new `data/benchmark.js` and canonical `data/benchmark.json` together.
Avoid long immutable cache lifetimes for the data file. Check the displayed
observation date after deployment.

### Input specification

Each observation includes:

- `observation_date`: a real `YYYY-MM-DD` date for the price observation.
- `published_at`: an ISO timestamp including a timezone, e.g. a UTC timestamp ending
  in `Z`. Publication cannot predate observation or be in the future.
- `usage_window.start` and `.end`: real dates; the window must end on or before the
  observation date. This makes any usage lag visible.
- `coverage_note`: what the inputs cover, including exclusions and limitations.
- `sources`: labeled public HTTP(S) source records, including at least one with
  `kind: "price"` and one with `kind: "usage"`.
- `constituents`: unique model IDs/names, `price_usd_per_million`, and `usage_tokens`.
  Prices are standardized US dollars per million model tokens; usage is actual
  token counts, **not percentages and not millions**. The site's fictional
  calculator separately labels its own usage inputs in millions.
- Optional `notes`: plain-text publication notes.

The browser calculates:

```text
weight_i = usage_tokens_i / sum(usage_tokens)
reference_USD_per_million_CCBT = sum(weight_i × price_USD_per_million_i)
CCBT_per_model_token_i = price_USD_per_million_i / reference_USD_per_million_CCBT
```

Do not enter a hand-calculated reference price or weights: they are derived from
the raw inputs. Numeric inputs must be finite and non-negative. Total usage and the
resulting reference must be positive; an all-zero price reference has no defined
relative conversion. All validation is structural/numerical. It does **not** certify
that sources are representative, that normalization is economically appropriate,
or that the result qualifies for a regulated use.

After the first valid observation, the Research page displays the reference price, dates,
relative model-price bars, complete constituent table, source links, coverage,
methodology notes, and a research CSV export. After at least two observations, a
historical chart appears automatically. Before then, there is no fabricated history.

### Keep an honest history

Append observations chronologically; do not overwrite old constituent prices with
current prices. Each observation retains its raw inputs, observation date, usage
window, source record, and publication time. The publisher rejects duplicate or
out-of-order dates.

This build supports **one defined market and methodology at a time**. Do not change
the global market scope or pricing convention and silently relabel old observations.
A methodological break requires a deliberately managed new series/version, an
archive of the old series, and disclosed treatment of the break. Do not present
reconstructed values as historical observations.

The `data` directory is public website data. Do not put confidential provider quotes,
personal information, credentials, or unlicensed private datasets in these files.
A real commercial-data ingestion system would need a separate, private backend.

## Deployment

No build step is required for the pages. Copy these files to the static root on your
existing host, preserving their paths:

```text
index.html             vision.html            participate.html
market.html            ccbt.html              benchmark.html
thesis.html            research.html
styles.css             home.css               narrative.css
refinement.css
site.js                site-config.js         favicon.svg
time-explorer.css      time-explorer.js
data/benchmark.js      data/benchmark.json
data/time-scenario.js  data/time-scenario.json

Optional standalone tools: calculator.html, time-explorer.html
```

You do not need to publish the helper scripts, test fixtures, observation template,
or handoff documentation. Preserve a backup of your original site. Then verify
navigation, mobile layout, the inquiry receiving route, and the observation date
on your actual domain. This package has not been deployed to standardbasis.co.

## Rebuild optional illustrations and standalone files

The two-date comparison is rendered as ordinary HTML, so its labels, prices, and
expandable calculation tables work without JavaScript. It takes Year 1 Q1 and Year 3 Q4
from `data/time-scenario.json`; prices are recomputed from unrounded weights and prices.
After changing that fictional scenario, regenerate the two cards:

```sh
python3 scripts/build_snapshots.py
```

The time explorer itself reads the separate browser companion `data/time-scenario.js`.
If you edit the canonical JSON, keep that companion synchronized as described in
`TIME-EXPLORER-UPDATE.md`. The scenario is unchanged in this release.

After changing the integrated calculator, shared CSS, scripts, or time-explorer blocks,
rebuild the optional single-file tools:

```sh
python3 scripts/build_calculator.py
```

Neither script collects or publishes research data.

## Run the tests

```sh
python3 tests/test_publisher.py
python3 tests/test_homepage.py
python3 tests/test_time_explorer.py
```

The publisher tests use only Python's standard library. Browser/layout tests require
BeautifulSoup, Playwright, and Chromium. `CHROMIUM_EXECUTABLE` can specify the browser path.

Read `QA.md` for browser checks and what remains unverified.
