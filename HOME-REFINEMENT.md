> Historical revision note. The current package includes the later narrative/research update. See `NARRATIVE-UPDATE.md` and `README.md` for current installation and page responsibilities.

# Homepage refinement: the market, the denomination, and financialization

This update builds on the complete Standard Basis time-explorer update. It does not change the CCBT formula, fictional scenario, arithmetic calculator, time explorer, allocation logic, research dataset, or contact configuration.

## The new homepage sequence

1. **The Market for AI Compute.** The opening identifies Standard Basis as the market/broker and CCBT as the proposed denomination.
2. **The problem.** Model-specific tokens and hardware-specific capacity do not, by themselves, provide a common economic unit across a changing market. The API-aggregator distinction is deliberately specific: access/routing and economic denomination solve different problems.
3. **The concept.** Separate cards explain the company and the general CCBT standard. A connecting panel explains Standard CCBT indices as specific implementations for defined markets.
4. **A Common Basis for AI Financialization.** The research reference is presented as one use of the denominator, alongside model-price conversion, future contracting, financing, and price-risk transfer. Potential applications are not presented as available products.
5. **The brokerage.** Buyers, Standard Basis, and providers retain visibly different roles.
6. **The basis through time.** The proposed economic commitment and eventual model selection remain separate. Direct links open the time and allocation demonstrations.
7. **Market development and participation.** The page connects transaction evidence to common references, then offers the existing buyer, provider, and research inquiry paths.

The navigation is now **Market / CCBT / In practice / Thesis / Participate**. The underlying routes have not changed. `benchmark.html` is headed **CCBT in Practice**, with shortcuts to the reference, calculator, timeline, and allocation tool.

## Install over the latest time-explorer build

Back up the deployed site first. Copy these files into the existing site directory:

- `index.html`
- `benchmark.html`
- `market.html`
- `ccbt.html`
- `thesis.html`
- `home.css` (new)

`home.css` is an additive stylesheet used by the homepage and the introductory navigation on the practice page. Keep the other files from the existing build. In particular, do **not** overwrite your customized `site-config.js`, `data/benchmark.js`, or `data/benchmark.json` when applying the patch.

The small patch ZIP is for the **time-explorer version** of the site. For a fresh installation or a version earlier than the time-explorer update, use the full-site ZIP instead. The full-site ZIP contains the configuration and data available in this conversation, not any later settings on your deployed website.

No frontend package installation or build step is required. Open `index.html` after extracting the complete site, or serve the folder with a static web server. The published website has not been modified.

## Data and contact behavior

The homepage still uses the shared `data/benchmark.js` publication component. A validated observation replaces its pre-publication state; no fictional observation has been added to the research series.

All three interactive demonstrations remain fictional and separate from the research data. Their original calculations and disclosure text have been retained.

The existing inquiry form behavior is unchanged. With no receiving address or submission endpoint configured, it prepares local drafts and does not claim to send them. Contact and founder settings remain in `site-config.js`.

## Verification

- 339 homepage/site checks: relative links and anchors, source assets, section order, responsive widths from 320 through 1440 pixels, menu behavior, inquiry drafts, calculator and time-explorer integration, and no-script fallbacks.
- 20 existing benchmark publisher unit tests.
- 59 existing time-explorer and allocation checks.
- The published-state rendering was tested using a synthetic fixture injected only into the browser document. Production data files remain pre-publication.
- All local checks ran in Chromium using in-memory copies of the static pages. No live domain, provider, market-data API, or inquiry endpoint was contacted. These checks do not constitute Safari, Firefox, or physical-device testing.

Run the added checks with `python tests/test_homepage.py`. They use BeautifulSoup4 and Playwright plus Chromium. The existing mathematical tests remain under `tests/`.
