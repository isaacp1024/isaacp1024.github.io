# Homepage, Vision, reference visual, and link refinement

## Install

This update is based on **standard-basis-economics-refinement.zip**. Unzip the patch
and copy its `standard-basis/` contents into the matching directory of that build.
Replace the files with the same names; add the new files. No files need to be deleted.

Use the full ZIP for a fresh local copy. Before overwriting any live deployment,
back up your current version. **Preserve your configured `site-config.js` and `data/`
files.** The patch deliberately omits them. They are byte-identical to the supplied
previous package in the full ZIP, but may differ from your own deployed edits.

`refinement.css`, `vision.html`, and `participate.html` are new required assets.
Publish all changed HTML and CSS together so navigation destinations exist.
Clear any host/CDN cache as appropriate, then test your actual receiving route.
Nothing in this delivery changes the live domain.

## Content organization

- Home: hero, problem, abstract concept, named proposal, and a six-destination directory.
- Vision: what Standard Basis is building, buyer/provider applications, changing-market
  comparison, the path toward liquidity, and a link to the original thesis.
- Market: commercial workflow, comparable offers, and proposed delivery structure.
- CCBT: the relocated English → two inputs → formula → applications explanation,
  followed by the substantive general methodology.
- In Practice: all three existing interactive demonstrations.
- Research: the existing, separate research-publication destination.
- Participate: the existing configurable form and founder details. The form IDs,
  recipient settings, optional endpoint, and draft/save/copy behavior are retained.
- Thesis: retained as a supporting paper, not another primary navigation tab.

Old homepage links such as `index.html#delivery`, `#ccbt`, `#participate`, and
`#inquiry` are redirected by the shared script to their new destinations. Role
query strings are preserved. With JavaScript disabled, use the visible site directory.
The homepage no longer contains a form or a benchmark/research placeholder.

## Two-date comparison

Vision and Market now show two equal-width market snapshots. Each has its usage
composition, date, **CCBT reference price**, quotation unit, and an expandable
weighted calculation. The previous central 100M balance is removed.

The figures come from the unchanged fictional scenario:

- Year 1, Q1: A / B / C; **$1.8485 per 1M CCBT**.
- Year 3, Q4: C / D / E / F / G; **$1.4850 per 1M CCBT**.

These are reference observations in an illustration, not purchase prices or a
forward quote. The visual separates the changing reference price from a contract's
agreed quantity and the buyer's chosen allocation.

The renderer recomputes each price from unrounded scenario inputs. To rebuild:

```sh
python3 scripts/build_snapshots.py
```

It updates the marked component in `vision.html` and `market.html`. No research file
is changed. Do not remove the `BEGIN/END MARKET CONTINUITY` comments.

## Link treatment

Directional links, lab section navigation, contents links, and small actions now
have visible outlines. Hover and keyboard focus invert them to black with light
text; focus also retains a visible outline. Ordinary prose links remain inline.
Directory cards use the same inversion. Navigation still works as ordinary HTML
without a frontend framework. Reduced-motion preferences are respected.

## Number controls

Each model-price input uses native `step="0.10"` with `min="0"`. Defaults remain
$0.80 / $2.00 / $5.00, all exact multiples of the step. Arrow keys and native spinner
buttons use ten-cent increments. Manually typed finer prices are still accepted;
only step mismatch is ignored for those prices, while range and numeric validation
remain in force. Usage controls are unchanged.

The common-basis equation, weighting visual, scenario, and allocation formulas are
unchanged. The optional standalone tools have been rebuilt with the same controls.

## Files intentionally preserved

`site-config.js`, all `data/` files, `styles.css`, `home.css`, `narrative.css`,
`time-explorer.css`, `time-explorer.js`, and the research publisher are unchanged.
See QA.md for the checks performed and their limits.
