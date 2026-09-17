#!/usr/bin/env python3
"""Render the two-date reference visual from the existing fictional time scenario.

Run after editing data/time-scenario.json. No network or third-party packages.
The snapshot cards are static and remain readable without JavaScript.
"""
from pathlib import Path
from html import escape
import json
import math
import re

ROOT = Path(__file__).resolve().parents[1]
BEGIN = '<!-- BEGIN MARKET CONTINUITY -->'
END = '<!-- END MARKET CONTINUITY -->'


def validate(data):
    if data.get('fictional') is not True:
        raise ValueError('This component is for the fictional scenario only.')
    if not data.get('models') or len(data.get('observations', [])) < 3:
        raise ValueError('Models and at least three observations are required.')
    for model in data['models']:
        if not re.fullmatch(r'#[a-fA-F0-9]{6}', model.get('color', '')):
            raise ValueError('Model color must be a six-digit hex color.')
    for observation in [data['observations'][2], data['observations'][-1]]:
        ws, ps = observation['weights'], observation['prices']
        if len(ws) != len(data['models']) or len(ps) != len(ws):
            raise ValueError('Constituent counts do not match.')
        if not all(isinstance(w, (float, int)) and math.isfinite(w) and w >= 0 for w in ws):
            raise ValueError('Usage shares must be finite and non-negative.')
        if not math.isclose(sum(ws), 1, abs_tol=1e-9):
            raise ValueError('Usage shares must sum to one.')
        for w, p in zip(ws, ps):
            if w and (not isinstance(p, (float, int)) or not math.isfinite(p) or p < 0):
                raise ValueError('Each consumed model needs a non-negative price.')


def render_card(data, observation, label, subscript):
    active = [(m, w, p) for m, w, p in zip(data['models'], observation['weights'], observation['prices']) if w > 0]
    price = sum(w*p for _, w, p in active)
    ids = [escape(m['id']) for m, _, _ in active]
    names = ', '.join(ids[:-1]) + (' &amp; ' if len(ids) > 1 else '') + ids[-1]
    quarter = (observation['monthInYear'] - 1)//3 + 1
    period = f"Year {observation['year']} · Q{quarter}"
    stack = ''.join(f'<span style="--share:{w*100:.10f}%;--model-color:{m["color"]}" title="{escape(m["name"])}: {w*100:.1f}%"></span>' for m,w,_ in active)
    legend = ''.join(f'<span><i aria-hidden="true" style="background:{m["color"]}"></i>{escape(m["id"])} <b>{w*100:.1f}%</b></span>' for m,w,_ in active)
    rows = ''.join(f'<tr><th scope="row"><i class="model-key" aria-hidden="true" style="background:{m["color"]}"></i>{escape(m["name"])}</th><td>{w*100:.2f}%</td><td>${p:.2f}</td><td>${w*p:.4f}</td></tr>' for m,w,p in active)
    note = ('These models and their market usage define the opening reference. The basket is not carried forward unchanged.' if subscript == '0' else 'This later reference uses the models, market usage, and token prices prevailing at this date.')
    return f'''<article class="continuity-snapshot" data-snapshot-month="{observation['month']}">
      <div class="snapshot-time"><span class="micro-label">t<sub>{subscript}</sub> / {label}</span><span class="snapshot-period">{period}</span></div>
      <h3 class="snapshot-models">Models {names}.</h3>
      <span class="snapshot-usage-label">Share of aggregate market token usage</span>
      <div class="future-market-bar" aria-hidden="true">{stack}</div>
      <div class="future-market-legend">{legend}</div>
      <div class="snapshot-price"><div><span class="micro-label">CCBT at t<sub>{subscript}</sub></span><small>USD / 1M CCBT</small><small>{period} · Fictional reference</small></div><strong data-snapshot-price="{price:.12f}">${price:.4f}</strong></div>
      <div class="snapshot-equation" role="math" aria-label="CCBT price equals the sum of model token price times aggregate market usage share"><span aria-hidden="true">Σ</span><span>(model price × usage share)</span><span aria-hidden="true">=</span><span>CCBT</span></div>
      <p class="snapshot-explanation">{note}</p>
      <details class="snapshot-calculation"><summary>Show the weighted calculation</summary><table>
      <caption>All prices and contributions are USD per million tokens or CCBT as applicable. Displayed values are rounded; the reference uses unrounded shares. Fictional inputs only.</caption>
      <thead><tr><th scope="col">Model</th><th scope="col">Market share</th><th scope="col">Token price</th><th scope="col">Contribution</th></tr></thead>
      <tbody>{rows}</tbody><tfoot><tr><th scope="row" colspan="3">CCBT reference</th><td>${price:.4f}</td></tr></tfoot></table></details>
    </article>'''


def render(data):
    validate(data)
    return f'''<div class="market-continuity">
      <div class="continuity-heading"><span class="micro-label">One representative segment / Two points in time</span><span class="badge example-badge">Fictional inputs · Not a quote</span></div>
      <div class="continuity-pair">{render_card(data,data['observations'][2],'Opening market','0')}{render_card(data,data['observations'][-1],'Later market','1')}</div>
      <div class="continuity-bottom"><div><h4>Same denomination. A different market price.</h4><p>The market basket defines the reference, not your allocation. A future balance converts into qualifying models at the prices prevailing when you consume it.</p></div><a class="text-link jump-link" href="benchmark.html#allocate">Allocate a future balance <span aria-hidden="true">↗</span></a></div>
    </div>'''


def main():
    data = json.loads((ROOT/'data/time-scenario.json').read_text(encoding='utf-8'))
    component = render(data)
    # Validate all targets before writing either file.
    pending = []
    for name in ['vision.html', 'market.html']:
        path=ROOT/name; text=path.read_text(encoding='utf-8')
        if text.count(BEGIN) != 1 or text.count(END) != 1:
            raise ValueError(f'{name}: expected one pair of component markers')
        before = text.split(BEGIN, 1)[0]
        after = text.split(END, 1)[1]
        pending.append((path, before+BEGIN+'\n'+component+'\n'+END+after))
    for path, text in pending:
        path.write_text(text, encoding='utf-8')
        print(f'Updated fictional two-date visual: {path.name}')

if __name__ == '__main__':
    main()
