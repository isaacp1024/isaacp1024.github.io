#!/usr/bin/env python3
"""Site-structure, responsive-layout, and interaction checks.

Requires beautifulsoup4 and playwright, with Chromium installed.
Sources are inlined in the browser: no HTTP server or network access is needed.
The static link pass checks relative destinations and fragment IDs separately.
"""
from pathlib import Path
from collections import Counter
from urllib.parse import urlsplit, unquote
import importlib.util
import json
import math
import os
import shutil
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','vision.html','market.html','ccbt.html','benchmark.html','research.html','thesis.html','participate.html']
results=[]

def check(label,condition):
    if not condition:raise AssertionError(label)
    results.append(label)

def inline_page(name,scripts=True,data=None):
    soup=BeautifulSoup((ROOT/name).read_text(),'html.parser')
    for link in soup.select('link[rel=stylesheet]'):
        style=soup.new_tag('style');style.string=(ROOT/link['href']).read_text();link.replace_with(style)
    for link in soup.select('link[rel=icon]'):link.decompose()
    sources=[]
    for script in soup.select('script[src]'):
        source=(ROOT/script['src']).read_text()
        if script['src']=='data/benchmark.js' and data is not None:
            source='window.SB_BENCHMARK = '+json.dumps(data)+';'
        sources.append(source);script.decompose()
    if scripts:
        for source in sources:
            script=soup.new_tag('script');script.string=source;soup.body.append(script)
    return str(soup)

def test_static():
    parsed={name:BeautifulSoup((ROOT/name).read_text(),'html.parser') for name in PAGES}
    for name,dom in parsed.items():
        counts=Counter(el['id'] for el in dom.select('[id]'))
        check(name+': unique IDs',all(n==1 for n in counts.values()))
        check(name+': one main heading',len(dom.select('h1'))==1)
        check(name+': Vision replaces Thesis in primary navigation',dom.select_one('#nav-links a[href="vision.html"]') is not None and not dom.select('#nav-links a[href="thesis.html"]'))
        check(name+': dedicated participation route',dom.select_one('#nav-links a[href="participate.html"]') is not None)
        for a in dom.select('a[href]'):
            u=urlsplit(a['href'])
            if u.scheme or u.netloc:continue
            target=unquote(u.path) or name
            check(name+': linked file '+a['href'],(ROOT/target).is_file())
            if u.fragment:
                td=parsed.get(target)
                if td is None:td=BeautifulSoup((ROOT/target).read_text(),'html.parser')
                check(name+': linked anchor '+a['href'],td.find(id=unquote(u.fragment)) is not None)
        for el in dom.select('script[src],link[href]'):
            path=el.get('src') or el.get('href')
            if not urlsplit(path).scheme:check(name+': local asset '+path,(ROOT/path).is_file())
        check(name+': research source isolated',bool(dom.select('script[src="data/benchmark.js"]'))==(name=='research.html'))
    home=parsed['index.html']
    check('Home: hero, problem, concept, proposal, directory only',[s.get('id') for s in home.select('main > section')]==[None,'problem','concept','proposal','explore'])
    check('Home: no inquiry form',home.select_one('#inquiry-form') is None)
    check('Home: directory points to six destinations',len(home.select('.explore-card'))==6)
    check('Home: abstract concept precedes named proposal','CCBT' not in home.select_one('#concept').get_text())
    check('Home: alternatives precede questions',str(home).index('class="solution-gap"')<str(home).index('class="question-frame"'))
    check('Standard: English and math moved together',parsed['ccbt.html'].select_one('#overview .core-math') is not None)
    check('Vision: buyer and provider applications',len(parsed['vision.html'].select('.vision-audience'))==2)
    check('Vision: original thesis retained as supporting paper',parsed['vision.html'].select_one('a[href="thesis.html"]') is not None and parsed['thesis.html'].select_one('#requirements') is not None)
    scenario=json.loads((ROOT/'data/time-scenario.json').read_text())
    for name in ['vision.html','market.html']:
        visual=parsed[name].select_one('.market-continuity')
        check(name+': no central 100M balance','100M' not in visual.get_text())
        cards=visual.select('.continuity-snapshot')
        check(name+': two market snapshots',len(cards)==2)
        for card in cards:
            o=scenario['observations'][int(card['data-snapshot-month'])]
            expected=sum(w*p for w,p in zip(o['weights'],o['prices']) if w)
            rendered=float(card.select_one('[data-snapshot-price]')['data-snapshot-price'])
            check(name+': snapshot price recomputes from scenario',math.isclose(expected,rendered,abs_tol=1e-10))
            check(name+': scope and units shown','USD / 1M CCBT' in card.get_text())
        check(name+': both calculations inspectable',len(visual.select('details.snapshot-calculation'))==2)
    prices=parsed['benchmark.html'].select('[data-calc-price]')
    check('All three native price steppers use $0.10',len(prices)==3 and all(x['step']=='0.10' for x in prices))
    check('All default prices are multiples of $0.10',all(math.isclose(float(x['value'])/.1,round(float(x['value'])/.1)) for x in prices))
    check('Research stays unpublished',json.loads((ROOT/'data/benchmark.json').read_text())['observations']==[])


def test_browser():
    errors=[];requests=[]
    with sync_playwright() as pw:
        executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
        browser=pw.chromium.launch(**({'executable_path':executable} if executable else {}),args=['--no-sandbox'])
        for name in PAGES:
            page=browser.new_page(viewport={'width':1440,'height':1000})
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:requests.append(r.url))
            page.set_content(inline_page(name));page.wait_for_timeout(80)
            for width in [320,360,390,480,640,760,768,820,900,1024,1280,1440]:
                page.set_viewport_size({'width':width,'height':900})
                check(f'{name}: no page overflow at {width}',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            if name=='index.html':
                page.set_viewport_size({'width':390,'height':844})
                page.locator('.nav-toggle').click()
                check('Mobile menu opens',page.locator('.nav-toggle').get_attribute('aria-expanded')=='true')
                page.keyboard.press('Escape')
                check('Escape closes menu',page.locator('.nav-toggle').get_attribute('aria-expanded')=='false')
                check('Menu focus restored',page.evaluate('document.activeElement.classList.contains("nav-toggle")'))
                page.set_viewport_size({'width':1440,'height':1000})
                a=page.locator('.question-answer .jump-link')
                normal=a.evaluate('(e)=>({border:getComputedStyle(e).borderTopStyle,width:getComputedStyle(e).borderTopWidth})')
                check('Jump links have a visible outline',normal['border']=='solid' and normal['width']=='1px')
                a.hover();page.wait_for_timeout(210)
                check('Hover inverts jump links to black',a.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(8, 11, 14)')
                check('Hover text becomes white',a.evaluate('(e)=>getComputedStyle(e).color')=='rgb(255, 255, 255)')
                page.locator('.explore-card').first.focus();page.wait_for_timeout(210)
                check('Directory cards have keyboard focus treatment',page.locator('.explore-card').first.evaluate('(e)=>getComputedStyle(e).outlineStyle')!='none')
            elif name in ['vision.html','market.html']:
                page.locator('.snapshot-calculation summary').first.click()
                check(name+': weighted calculation expands',page.locator('.snapshot-calculation').first.get_attribute('open') is not None)
                page.set_viewport_size({'width':320,'height':900})
                for details in page.locator('.snapshot-calculation').all(): details.evaluate('(e)=>e.open=true')
                check(name+': expanded calculations fit 320px',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            elif name=='participate.html':
                page.locator('[data-role="provider"]').click()
                check('Provider path selects provider role',page.locator('#inquiry-role').input_value()=='provider')
                page.locator('#inquiry-name').fill('Test participant')
                page.locator('#inquiry-email').fill('test@example.com')
                page.locator('#inquiry-company').fill('Test fixture')
                page.locator('#inquiry-message').fill('A local test only. Nothing should be submitted.')
                page.locator('#inquiry-submit').click()
                check('Moved inquiry form prepares draft',page.locator('#inquiry-result').is_visible())
                check('No fake delivery claim','not sent' in page.locator('#inquiry-result-label').inner_text().lower())
                check('Draft carries the selected role','Provider' in page.locator('#inquiry-draft').input_value())
                with page.expect_download() as dl:page.locator('#save-inquiry').click()
                check('Draft can be saved',dl.value.suggested_filename.endswith('.txt'))
            elif name=='benchmark.html':
                check('Calculator default is unchanged',page.locator('#calc-value').inner_text()=='$1.8485')
                for letter,base in [('a',.8),('b',2),('c',5)]:
                    field=page.locator('#example-price-'+letter)
                    field.focus();page.keyboard.press('ArrowUp')
                    check('ArrowUp steps '+letter+' by ten cents',math.isclose(float(field.input_value()),base+.1,abs_tol=1e-10))
                    page.keyboard.press('ArrowDown')
                    check('ArrowDown restores '+letter,math.isclose(float(field.input_value()),base,abs_tol=1e-10))
                check('Stepping back restores reference',page.locator('#calc-value').inner_text()=='$1.8485')
                page.locator('#example-price-a').fill('0.85')
                check('Fine manual prices remain usable',page.locator('#calc-error').is_hidden() and page.locator('#calc-value').inner_text()=='$1.8737')
                page.locator('#example-price-a').fill('-1')
                check('Negative prices rejected',page.locator('#calc-error').is_visible() and page.locator('#export-example').is_disabled())
                page.locator('#reset-example').click()
                check('Reset retains clean currency defaults',[page.locator('#example-price-'+x).input_value() for x in 'abc']==['0.80','2.00','5.00'])
                for x in 'abc':page.locator('#example-usage-'+x).fill('0')
                check('Zero usage rejected',page.locator('#calc-value').inner_text()=='—')
                page.locator('#reset-example').click()
                with page.expect_download() as dl:page.locator('#export-example').click()
                check('Calculator CSV still exports',dl.value.suggested_filename.endswith('.csv'))
                check('Time explorer still loads',page.locator('#time-reference-price').inner_text()=='$1.4850')
                page.locator('[data-time-jump="14"]').click()
                check('D peak updates all time views',page.locator('#time-reference-price').inner_text()=='$3.6168')
                page.locator('[data-time-resolution="month"]').click()
                check('Monthly mode has 36 periods',page.locator('#time-cursor').get_attribute('max')=='35')
                page.locator('#allocation-amount').fill('100')
                page.locator('[data-allocation-preset="market"]').click()
                check('Market allocation still preserves token mix',page.evaluate('''() => {const a=StandardBasisTime,s=a.getState(),p=a.math.purchase(100,s.mode,s.buy),r=a.math.allocationResult(p.ccbt,s.use,s.shares);return Math.abs(r.totalTokens-p.ccbt)<1e-8;}'''))
            elif name=='research.html':
                check('Research accurately says pre-publication',page.locator('[data-benchmark] .badge').text_content().strip()=='Pre-publication')
                check('No invented published price',page.locator('.reference-value').count()==0)
            page.close()
        # Confirm actual Research rendering using a strictly in-memory test fixture.
        spec=importlib.util.spec_from_file_location('publisher_fixture',ROOT/'tests/test_publisher.py')
        fixture_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture_module)
        page=browser.new_page(viewport={'width':1440,'height':900})
        page.set_content(inline_page('research.html',data=fixture_module.fixture()))
        check('Validated research fixture renders',page.locator('.reference-value').inner_text()=='$1.85')
        check('Published research has constituents',page.locator('.benchmark-panel .bar-row').count()==3)
        page.set_viewport_size({'width':320,'height':900})
        check('Published Research fits mobile',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.close()
        for name in ['index.html','vision.html','participate.html']:
            page=browser.new_page(java_script_enabled=False,viewport={'width':390,'height':844})
            page.set_content(inline_page(name,scripts=False))
            check(name+': no-JS navigation is available',page.locator('#nav-links').is_visible())
            check(name+': no-JS layout fits mobile',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            if name=='vision.html':check('Snapshot references readable without JS',page.locator('[data-snapshot-price]').count()==2)
            if name=='participate.html':check('No-JS form does not fake sending',page.locator('#inquiry-submit').is_disabled())
            page.close()
        check('No script errors',not errors)
        check('No network requests from inlined sources',not requests)
        browser.close()

if __name__=='__main__':
    test_static();test_browser()
    print(f'PASS: {len(results)} checks')
    for item in results:print('  PASS',item)
