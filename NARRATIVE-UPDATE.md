# Narrative and research separation update

## Install

This update is based on the **homepage-refinement build**, which already includes the time and allocation explorers. Back up the deployed files first.

For a fresh installation, copy the complete website folder to your static host. There is no frontend build step. Configure your actual receiving email in `site-config.js` before opening inquiries to visitors.

For an existing installation, overlay the patch on the folder containing `index.html`. It includes these website changes:

- Revised `index.html`, `market.html`, `ccbt.html`, `benchmark.html`, and `thesis.html`.
- New `research.html` and `narrative.css`.
- Updated `site.js`: research links now point to `research.html`; the research page's status line updates when a validated observation is published. Calculation logic is unchanged.
- Regenerated optional `calculator.html` and `time-explorer.html` standalone tools, including the clarified allocation introduction.

The patch also includes current documentation and the updated homepage regression test. It does **not** include or overwrite `site-config.js`, any `data/` files, `styles.css`, `home.css`, `time-explorer.css`, `time-explorer.js`, or the publication helper. Keep these files from the existing build. Clear any host/CDN cache after deployment.

## Homepage sequence

1. Hero — broad AI economics, not only financing.
2. The problem — fragmentation, usage-linked spending, cost-benefit analysis, and planning.
3. Existing approaches — access/routing, hardware capacity, and expenditure tools appear before the open questions.
4. The concept — a universal token-denomination standard, introduced without the CCBT product name.
5. Our proposal — CCBT, Standard Basis, and the specific Standard CCBT market implementations.
6. The common denominator — plain-English model, two market inputs, word equation, formal mathematics, then usefulness and financial-market applications.
7. CCBT in action — construct, follow through time, allocate.
8. The market — brokerage and future-consumption procurement.
9. The basis through time — a 100M CCBT quantity follows the delivery-period market rather than a frozen opening basket.
10. Market development and participation.

## The three concepts kept separate

**Market usage** determines the reference weights. It means qualifying token consumption across the defined market; one buyer's preferred allocation is not the index's usage distribution.

**Your allocation** determines how your CCBT balance converts into qualifying model tokens at the selected time. It need not reproduce market usage weights.

**Research publication** is a measurement of an actual specified market. The mathematics and fictional demonstrations do not become market observations simply because they are shown on the website.

## Research migration

`research.html` is the only page that loads `data/benchmark.js`. It keeps the existing validated publication renderer, source and constituent table, CSV export, history, and implementation-specification renderer. Before any observation exists, it displays an explicit pre-publication placeholder without a made-up price.

The same data schema and `scripts/publish_benchmark.py` workflow continue to work. Publishing data will update Research; it will no longer replace homepage educational content. The general methodology page links to Research for implementation-specific status.

`benchmark.html` remains the In Practice URL, so calculator, timeline, and allocation deep links stay intact. Its former publication panel is replaced by a static visual explanation of the two inputs and their mathematics. The legacy `benchmark.html#reference` anchor leads to a link to Research, not a fabricated reference price.

## Core-model presentation

The calculation is shown first in English, then as:

    P_CCBT,t = sum(p_i,t * q_i,t) / sum(q_i,t)
             = sum(w_i,t * p_i,t)
    w_i,t    = q_i,t / sum(q_j,t)

`q` is aggregate market-token usage, not personal allocation. `p` is a standardized model-token price. The general formula leaves pricing conventions, market scope, coverage, and observation periods to the implementation. It does not assign economic value to model output.

## Future-market illustration

The homepage uses the exact opening and closing usage distributions from the existing fictional time scenario: A/B/C at the start and C/D/E/F/G at the end. It introduces no new observed data and does not change the scenario.

The 100M CCBT quantity is illustrative, not an executable contract. What is held fixed is the agreed denomination and quantity, not dollar value, native token counts, a quality level, or today's model mix. The relevant reference and model-token conversion prices are those at the agreed delivery period. Eligibility, delivery, capacity, and remedies remain contractual.

## Preservation

Configuration, canonical research data, fictional scenario inputs, calculator arithmetic, allocation arithmetic, publisher validation, and base visual styles were preserved. No receiving address was guessed, no market observation was added, and nothing was deployed to the live domain.
