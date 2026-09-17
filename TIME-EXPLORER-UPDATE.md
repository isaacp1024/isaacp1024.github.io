> Historical revision note. The current package includes the later narrative/research update. See `NARRATIVE-UPDATE.md` and `README.md` for current installation and page responsibilities.

# Standard CCBT: through time and into a consumption basket

This update adds two fictional, interactive sections immediately after the existing
weighted-area calculator on `benchmark.html`. The old calculator and the actual
research-reference data path remain separate and unchanged.

## Open it

- `time-explorer.html`: standalone three-year explorer and allocation tool.
- `calculator.html`: standalone original calculator plus both new sections.
- `benchmark.html`: both additions in the full Standard Basis website.

The two standalone files contain all required styles, scripts and scenario data.
They do not require installation, a server, external fonts, or a network connection.
There is no connection to the live domain and nothing has been deployed.

## Update an existing copy

Replace `benchmark.html`, then add these files in their matching locations:

- `time-explorer.css`
- `time-explorer.js`
- `data/time-scenario.js`
- `data/time-scenario.json` (inspectable source copy)

Keep your existing `site-config.js`, `site.js`, `styles.css` and
`data/benchmark.*`. They have not been changed by this update. The added stylesheet
is namespaced to the new tools apart from an accessible skip-link visibility rule.
If you have edited `benchmark.html` yourself, merge its new stylesheet/script imports,
section-navigation links, and the block between `BEGIN TIME EXPLORERS` and
`END TIME EXPLORERS` instead of replacing your changes.

The ZIP also includes updated standalone builds and an updated optional builder:

    python scripts/build_calculator.py

The builder regenerates both standalone HTML files from the benchmark-page block,
shared scripts/styles, and scenario. It uses only the Python standard library.

## What the time explorer does

The fictional series is called **Standard CCBT · Representative segment**. There
are 36 constructed month-end observations. The default quarterly view samples
months 3, 6, 9 and 12 of each year: twelve end-of-quarter snapshots, not twelve
quarterly averages. The monthly view exposes all 36 observations.

Three synchronized charts show usage shares, individual model-token prices, and
the resulting usage-weighted CCBT price. The slider, chart clicks/drags, three
milestone buttons, and explicit Play control inspect the same date. Play does not
start automatically, stops at the end, pauses when the tab is hidden, and can be
stopped with Escape. Highlighting a model does not remove it from the calculation.

The opening set is A/B/C. D enters, reaches 40% of usage at Year 2 Q1, and ends at
1%. A and B leave. The final set is C/D/E/F/G. The calculation strip shows each
qualifying model's price times its usage share at the inspected date. A data table
and CSV export expose the inputs and conversion prices.

The starting reference is 183/99 = 1.848484848... USD per million CCBT. The peak is
3.6168 at Year 2 Q1. The closing reference is 1.485. These are designed teaching
values, not market observations or forecasts. The reference can rise even while
individual prices fall because consumption moves toward higher-priced models.
The line is a usage-weighted arithmetic mean, not a median model price.

## Allocation mechanics

Purchase and consumption dates are separate. Set them to the same date for an
ordinary at-that-time conversion. Consumption cannot precede purchase.

Amounts are entered either as **million CCBT** or as an actual **USD budget**.
Switching the input mode preserves the economic amount, subject to display/input
rounding. Changing the purchase date in CCBT mode preserves the entered quantity;
changing it in USD mode preserves the entered initial budget.

All internal quantity calculations below use millions. Let:

- P0 = the purchase-date USD price per million CCBT;
- PT = the consumption-date USD price per million CCBT;
- pi = the consumption-date USD price per million model-i tokens;
- B = initial budget in USD;
- N = million CCBT held;
- ai = the share of the CCBT balance allocated to model i.

Then:

    N = B / P0                   (when a dollar budget is entered)
    initial outlay = N * P0
    consumption reference equivalent = N * PT
    conversion price = pi / PT  (CCBT per model token)
    model-i tokens, in millions = N * ai * PT / pi

The demo assumes a prepaid, index-linked entitlement purchased at the selected
spot reference. This is an explicit simplification, not actual forward pricing.
It does not model fees, financing, forward premiums, basis, capacity, credit,
execution or guaranteed delivery. The consumption-date dollar equivalent is not
a cash balance or a promised payout. No trade is submitted.

The pie shows shares of your **CCBT balance**, not market usage and not token
counts. Sliders and percentage inputs rebalance the other shares proportionally.
The entire balance is always allocated. Presets are:

- **Equal CCBT:** equal spending shares across currently eligible models.
- **Market token mix:** ai = wi * pi / PT, where wi is market token usage share.
  This reproduces the market's token mix; copying wi into the spending pie would
  not. With this preset, the total native-token count equals N million, before
  display rounding. That is an arithmetic identity, not a quality assertion.

You can also allocate 100% to a selected model. Selecting a pie slice changes the
worked conversion below it. A custom basket preserves surviving shares when the
consumption date changes and redistributes shares released by departed models.
New models start at zero in a custom basket. Presets recompute for the new date.

Only positive-usage models are considered eligible in this invented scenario.
That is a demonstration rule, not a proposed general eligibility methodology.
Each model has its own native token count; their sum does not measure equivalent
work, output quality or intelligence.

## Editing the fictional scenario

`data/time-scenario.json` contains the complete scenario with a `fictional: true`
flag, units, time convention, model colors, and all 36 observations. The adjacent
`.js` file contains the same object assigned to `window.CCBT_TIME_SCENARIO` so the
static website works without `fetch`. Keep both in sync when editing:

    python -c "import json,pathlib; p=pathlib.Path('data/time-scenario.json'); d=json.loads(p.read_text()); p.with_suffix('.js').write_text('window.CCBT_TIME_SCENARIO = '+json.dumps(d,indent=2)+';\n')"

The client validates the full series before showing any calculations. Usage
weights must sum to one; eligible model prices must be strictly positive;
ineligible prices must be null; and each stored CCBT price must equal the
weighted sum. Prices have units of USD per million model tokens, never dollars
per single token. This scenario is never passed to the benchmark publisher.

## Checks

`tests/test_time_explorer.py` exercises the standalone build in Chromium using
Playwright. This development-only dependency is not used by the website. The
script can use an installed `chromium` executable or `CHROMIUM_EXECUTABLE`.
It also checks all 666 valid purchase/consumption date combinations, both
allocation presets, availability changes, exports, playback, input validation,
and layouts from 320 through 1440 pixels.

The test harness renders local HTML contents in the browser. Browser network
transport, third-party hosting, Safari/Firefox, and the live domain were not
part of these checks. CSV payload generation was tested independently of the
browser's download-transport policy.
