STANDARD BASIS — CURRENT STATIC WEBSITE

Open index.html after unzipping. Keep website assets together.
No frontend installation, external fonts, framework, database, or data feed required.

EIGHT PAGES
index.html: Problem, concept, proposal, then a directory of other destinations.
vision.html: The company, longer-term buyer/provider applications, and the basis through time.
market.html: Procurement, provider offers, and the proposed future-delivery structure.
ccbt.html: Plain-English core model, mathematics, and general methodology.
benchmark.html: In Practice — interactive calculator, timeline, and allocation.
research.html: Publication status, research observations, and implementation notes.
thesis.html: Original founding thesis, linked from Vision.
participate.html: The existing buyer/provider/research inquiry form.

UPGRADING
Read SITE-REFINEMENT.md first. Use the patch over the economics-refinement build.
Keep your existing site-config.js and data/ files. refinement.css, vision.html,
and participate.html are new required files. Earlier notes are revision history.

PRICE COMPARISON
Vision and Market show the fictional opening and closing reference prices.
No large 100M quantity appears between the market snapshots.
The scenario inputs, time-explorer logic, and allocation formulas are unchanged.

CALCULATOR
Price arrows move by $0.10. Defaults remain $0.80, $2.00, and $5.00.
Finer prices can still be entered manually. Reset and exports remain available.

CONTACT
Configure a real receiving address in site-config.js before launch.
The default mode prepares local drafts only; it does not send inquiries.
The inquiry form is now on participate.html.

RESEARCH
Only research.html displays supplied published observations.
Edit data/benchmark.json and run python3 scripts/publish_benchmark.py.
Fictional demonstrations never populate the research series.

OPTIONAL SINGLE-FILE TOOLS
calculator.html: Full interactive lab.
time-explorer.html: Timeline and allocation.

See README.md for configuration, schema, and deployment.
See QA.md for tests and limitations.
The live website has not been changed.
