from pathlib import Path
import json, math, os, shutil, tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=Path(tempfile.mkdtemp(prefix='ccbt-time-tests-'))
HTML=(ROOT/'time-explorer.html').read_text()
results=[]
def ok(label,test):
 assert test,label
 results.append(label)
def state(page):return page.evaluate('window.StandardBasisTime.getState()')
def setrange(page,id,value):
 page.locator(id).evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));}',str(value))
def snapshot(page):
 return page.evaluate('''() => { const api=window.StandardBasisTime,s=api.getState();
  const n=Number(document.querySelector('#allocation-amount').value);
  const p=api.math.purchase(n,s.mode,s.buy),r=api.math.allocationResult(p.ccbt,s.use,s.shares);
  return {s,p,r}; }''')
with sync_playwright() as pw:
 chrome = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
 browser=pw.chromium.launch(**({'executable_path':chrome} if chrome else {}),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(HTML)
 page.wait_for_timeout(300)
 ok('loads without script errors',errors==[])
 ok('initial and closing model sets',page.evaluate('''() => { const d=StandardBasisTime.data;
 return d.observations[2].weights.filter(v=>v>0).length===3&&d.observations[35].weights.slice(0,2).every(v=>v===0)&&d.observations[35].weights.slice(2).every(v=>v>0); }'''))
 ok('36 weights sum to 1 and means are bounded by current model prices',page.evaluate('''() => StandardBasisTime.data.observations.every(o=>{
 const ps=o.prices.filter(p=>p!==null);return Math.abs(o.weights.reduce((a,b)=>a+b,0)-1)<1e-10&&o.ccbt>=Math.min(...ps)-1e-10&&o.ccbt<=Math.max(...ps)+1e-10;})'''))
 ok('D peaks at 40% and ends at 1%',page.evaluate('''() => Math.max(...StandardBasisTime.data.observations.map(o=>o.weights[3]))===.4&&StandardBasisTime.data.observations[35].weights[3]===.01'''))
 ok('opening CCBT matches existing example',page.evaluate('Math.abs(StandardBasisTime.data.observations[2].ccbt-183/99)<1e-12'))
 ok('closing CCBT is 1.485',page.locator('#time-reference-price').inner_text()=='$1.4850')
 page.locator('[data-time-jump="14"]').click()
 ok('milestone updates every time view',state(page)['cursor']==14 and page.locator('#time-reference-price').inner_text()=='$3.6168' and page.locator('[data-legend-value="3"]').inner_text()=='40.0%')
 before=page.locator('#time-reference-price').inner_text()
 page.locator('[data-highlight="3"]').click()
 ok('highlight does not change reference or weights',state(page)['highlight']==3 and page.locator('#time-reference-price').inner_text()==before)
 page.locator('[data-time-resolution="month"]').click()
 ok('monthly mode offers 36 observations and dates',page.locator('#time-cursor').get_attribute('max')=='35' and page.locator('#allocation-purchase option').count()==36)
 setrange(page,'#time-cursor',0)
 ok('monthly date at start selects A B C',state(page)['cursor']==0 and page.locator('#time-period').inner_text()=='Year 1 · Month 1')
 page.locator('[data-time-resolution="quarter"]').click()
 ok('quarterly mode snaps to month-end 3',state(page)['cursor']==2 and page.locator('#time-cursor').get_attribute('max')=='11')
 page.locator('#time-cursor').focus();page.keyboard.press('ArrowRight')
 ok('keyboard timeline works',state(page)['cursor']==5)
 page.locator('#time-usage-chart').click(position={'x':40,'y':30})
 ok('chart selects corresponding period',state(page)['cursor']==2)
 page.locator('#time-play').click();page.wait_for_timeout(1050)
 ok('play advances one quarter',state(page)['playing'] and state(page)['cursor']==5)
 page.keyboard.press('Escape')
 ok('Escape pauses playback',not state(page)['playing'])
 # Pure math invariants at all dates for every preset.
 ok('market token-mix preset recovers 100M tokens at all 36 dates',page.evaluate('''() => {
 const a=StandardBasisTime;return a.data.observations.every(o=>{
  const s=a.math.marketShares(o.month),r=a.math.allocationResult(100,o.month,s);
  return Math.abs(s.reduce((a,b)=>a+b,0)-1)<1e-10&&Math.abs(r.totalTokens-100)<1e-9&&r.tokens.every((n,i)=>Math.abs(n/100-o.weights[i])<1e-10);
 });}'''))
 ok('same-date conversion equals direct dollar allocation',page.evaluate('''() => {
 const a=StandardBasisTime;return a.data.observations.every(o=>{
 const p=a.math.purchase(1000,'usd',o.month),s=a.math.equalShares(o.month),r=a.math.allocationResult(p.ccbt,o.month,s);
 return r.tokens.every((n,i)=>o.prices[i]===null?n===0:Math.abs(n-1000*s[i]/o.prices[i])<1e-8);
 });}'''))
 # Allocation toggles preserve economic values.
 snap=snapshot(page);p0=snap['p']
 page.locator('[data-allocation-mode="usd"]').click()
 snap=snapshot(page)
 ok('switching quantity to USD preserves balance',math.isclose(snap['p']['ccbt'],p0['ccbt'],rel_tol=1e-10))
 page.locator('#allocation-amount').fill('1000')
 page.locator('#allocation-purchase').select_option('14')
 snap=snapshot(page)
 ok('USD mode fixes budget while purchase date changes',math.isclose(snap['p']['cost'],1000,abs_tol=1e-8) and math.isclose(snap['p']['ccbt'],1000/3.6168,rel_tol=1e-10))
 page.locator('[data-allocation-mode="ccbt"]').click()
 before=snapshot(page)['p']['ccbt']
 page.locator('#allocation-purchase').select_option('2')
 ok('quantity mode fixes CCBT while entry price changes',math.isclose(snapshot(page)['p']['ccbt'],before,rel_tol=1e-10))
 page.locator('#allocation-amount').fill('100')
 page.locator('[data-allocation-preset="market"]').click()
 snap=snapshot(page)
 ok('market preset UI matches token mix rather than spend mix',math.isclose(snap['r']['totalTokens'],100,abs_tol=1e-8) and not math.isclose(snap['s']['shares'][2],.15,abs_tol=1e-4))
 page.locator('[data-allocation-preset="equal"]').click()
 ok('equal preset splits CCBT equally',all(math.isclose(s,.2) for s in state(page)['shares'][2:]))
 setrange(page,'#allocation-slider-3',80)
 snap=snapshot(page)
 ok('custom slider keeps exact total and rebalances others',math.isclose(sum(snap['s']['shares']),1,abs_tol=1e-12) and math.isclose(snap['s']['shares'][3],.8) and all(math.isclose(snap['s']['shares'][i],.05) for i in [2,4,5,6]))
 page.locator('#allocation-percent-3').fill('37.5');page.locator('#allocation-percent-3').blur()
 ok('percentage entry updates basket',math.isclose(state(page)['shares'][3],.375,abs_tol=1e-12))
 page.locator('#allocation-percent-3').fill('999');page.locator('#allocation-percent-3').blur()
 ok('out-of-range share is not applied',math.isclose(state(page)['shares'][3],.375,abs_tol=1e-12) and page.locator('#allocation-date-notice').is_visible())
 page.locator('#allocation-all-model').select_option('3');page.locator('#allocation-all-button').click()
 snap=snapshot(page)
 ok('100% pie slice handles full circle',snap['s']['shares'][3]==1 and page.locator('#allocation-donut path').count()==1 and math.isclose(snap['r']['tokens'][3],100*1.485/1.9))
 page.locator('[data-allocation-preset="equal"]').click()
 # Availability boundary and retirement.
 page.locator('#allocation-consumption').select_option('2')
 ok('same-time opening basket excludes future models',page.locator('[data-allocation-model]').count()==3 and state(page)['use']==2)
 page.locator('#allocation-all-model').select_option('0');page.locator('#allocation-all-button').click()
 page.locator('#allocation-consumption').select_option('35')
 snap=snapshot(page)
 ok('retired custom position reallocates safely and sums to 1',all(snap['s']['shares'][i]==0 for i in [0,1]) and math.isclose(sum(snap['s']['shares']),1,abs_tol=1e-10))
 page.locator('#allocation-consumption').select_option('2')
 page.locator('#allocation-purchase').select_option('20')
 ok('date ordering prevents consumption before purchase',state(page)['use']==20 and state(page)['buy']==20 and page.locator('#allocation-date-notice').is_visible())
 # Synced explorer period is explicitly adopted, not silently linked.
 setrange(page,'#time-cursor',1)
 page.locator('#allocation-use-cursor').click()
 ok('use explored period synchronizes dates with a notice',state(page)['use']==5 and state(page)['buy']==5)
 page.locator('#allocation-amount').fill('')
 ok('empty budget clears calculations and disables export',page.locator('#allocation-initial-usd').inner_text()=='—' and page.locator('#allocation-total-tokens').inner_text()=='—' and page.locator('#allocation-export').is_disabled())
 page.locator('#allocation-amount').fill('-1')
 ok('negative amount is rejected',page.locator('#allocation-error').is_visible() and page.locator('#allocation-initial-usd').inner_text()=='—')
 page.locator('#allocation-amount').fill('1000000000001')
 ok('oversize amount is rejected',page.locator('#allocation-error').is_visible())
 page.locator('#allocation-amount').fill('0')
 ok('zero is valid without NaN or division failures',page.locator('#allocation-error').is_hidden() and snapshot(page)['r']['totalTokens']==0 and page.locator('#allocation-initial-usd').inner_text()=='$0.00')
 page.locator('#allocation-amount').fill('100')
 page.locator('#allocation-consumption').select_option('35')
 page.locator('#allocation-purchase').select_option('2')
 page.locator('[data-allocation-preset="market"]').click()
 # Capture generated CSV payloads (not browser download transport).
 page.evaluate('''() => { window.__blobs=[]; const old=URL.createObjectURL; URL.createObjectURL=(b)=>{__blobs.push(b);return old(b)}; HTMLAnchorElement.prototype.click=function(){}; }''')
 page.locator('#time-export').click()
 csv=page.evaluate('window.__blobs.at(-1).text()')
 ok('scenario export has 252 model observations plus header',len(csv.strip().splitlines())==253 and '"fictional"' in csv and 'contribution_usd_per_1m_ccbt' in csv)
 page.locator('#allocation-export').click()
 csv=page.evaluate('window.__blobs.at(-1).text()')
 ok('allocation export includes exact units and conversion assumptions',len(csv.strip().splitlines())==6 and 'allocated_million_ccbt' in csv and 'Illustrative prepaid' in csv)
 page.locator('#allocation-donut path').first.focus();page.keyboard.press('Enter')
 ok('donut slices are keyboard-selectable',state(page)['selected']==2)
 ok('no runtime errors throughout interactions',errors==[])
 # All date combinations: N remains fixed, value and token allocations use T.
 ok('all valid purchase/consumption combinations conserve reference equivalent',page.evaluate('''() => {
 const api=StandardBasisTime; for(let a=0;a<36;a++)for(let b=a;b<36;b++){
  const p=api.math.purchase(1234,'usd',a),s=api.math.equalShares(b),r=api.math.allocationResult(p.ccbt,b,s),o=api.data.observations[b];
  const spent=r.tokens.reduce((v,n,i)=>v+n*(o.prices[i]||0),0);
  if(Math.abs(spent-r.equivalent)>1e-7)return false;
 }return true;}'''))
 # Reinitialize to default for responsive layout checks.
 page.close()
 for width in [320,375,390,540,620,768,900,1024,1440]:
  q=browser.new_page(viewport={'width':width,'height':950})
  q.set_content(HTML);q.wait_for_timeout(150)
  dimensions=q.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})')
  ok(f'no page horizontal overflow at {width}px',dimensions['s']<=dimensions['w'])
  problems=q.evaluate('''()=>Array.from(document.querySelectorAll('.time-panel input,.time-panel select,.time-panel button')).filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.left<-1||r.right>innerWidth+1)}).map(n=>n.id||n.textContent)''')
  ok(f'controls fit viewport at {width}px',not problems)
  if width==390:
   q.locator('[data-time-resolution="month"]').click()
   setrange(q,'#time-cursor',14)
   q.locator('#time-reference-chart').screenshot(path=str(OUTPUT/'month-chart-mobile.png'))
  q.close()
 # Existing calculator can still be edited alongside the new tools.
 q=browser.new_page(viewport={'width':1440,'height':1000});q.set_content((ROOT/'calculator.html').read_text());q.wait_for_timeout(200)
 ok('existing calculator retains original opening result',q.locator('#calc-value').inner_text()=='$1.8485')
 q.locator('#example-price-a').fill('1.60')
 ok('existing calculator is independent of timeline',q.locator('#calc-value').inner_text()!='$1.8485' and q.locator('#time-reference-price').inner_text()=='$1.4850')
 q.close();browser.close()
(OUTPUT/'test-results.json').write_text(json.dumps({'passed':len(results),'checks':results},indent=2))
print(json.dumps({'passed':len(results),'checks':results},indent=2))
