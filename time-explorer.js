/* Standard Basis — dependency-free, fictional time and allocation explorers.
 * Published benchmark data and the editable three-model calculator are untouched.
 * All price quotations are USD per million; all quantity calculations use millions.
 */
(() => {
  "use strict";
  const explorer = document.getElementById("ccbt-time-explorer");
  const allocator = document.getElementById("ccbt-allocation");
  if (!explorer || !allocator) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const source = window.CCBT_TIME_SCENARIO;
  const NS = "http://www.w3.org/2000/svg";
  const EPS = 1e-10;
  const fmt = (n, digits = 2) => Number(n).toLocaleString("en-US", {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const quote = (n) => "$" + fmt(n, 4);
  function money(n) {
    if (n >= 1e12) return "$" + fmt(n / 1e12) + "T";
    if (n >= 1e9) return "$" + fmt(n / 1e9) + "B";
    if (n >= 1e7) return "$" + fmt(n / 1e6) + "M";
    return "$" + fmt(n);
  }
  function quantity(millions, digits = 2) {
    if (millions >= 1e9) return fmt(millions / 1e9, digits) + "Q";
    if (millions >= 1e6) return fmt(millions / 1e6, digits) + "T";
    if (millions >= 1e3) return fmt(millions / 1e3, digits) + "B";
    if (millions > 0 && millions < 0.01) return fmt(millions * 1e6, 2);
    return fmt(millions, digits) + "M";
  }
  const text = (id, value) => { document.getElementById(id).textContent = value; };
  function element(tag, className = "", content = null) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (content !== null) n.textContent = content;
    return n;
  }
  function svgNode(tag, attrs = {}, content = null) {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, String(value));
    if (content !== null) n.textContent = String(content);
    return n;
  }
  function saveCSV(name, rows) {
    const content = rows.map(row => row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([content], {type: "text/csv;charset=utf-8"}));
    const a = element("a"); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  function validSource(d) {
    return d && d.fictional === true && Array.isArray(d.models) && d.models.length === 7 &&
      Array.isArray(d.observations) && d.observations.length === 36 && d.observations.every((o, index) =>
        o.month === index && o.weights.length === 7 && o.prices.length === 7 &&
        o.weights.every(w => Number.isFinite(w) && w >= 0) && Math.abs(o.weights.reduce((a, b) => a + b, 0) - 1) < EPS &&
        o.prices.every((p, i) => o.weights[i] === 0 ? p === null : Number.isFinite(p) && p > 0) &&
        Number.isFinite(o.ccbt) && o.ccbt > 0 && Math.abs(o.ccbt - o.weights.reduce((sum, w, i) => sum + w * (o.prices[i] || 0), 0)) < EPS);
  }
  if (!validSource(source)) {
    const n = element("p", "time-static-note", "The fictional scenario could not be loaded or failed validation. No price or conversion has been calculated.");
    explorer.prepend(n);
    $$('button,input,select', explorer).concat($$('button,input,select', allocator)).forEach(n => n.disabled = true);
    return;
  }
  const models = source.models;
  const observations = source.observations;
  const at = (month) => observations[month];
  const active = (month) => models.map((_, i) => i).filter(i => at(month).weights[i] > 0);
  const periodLabel = (month, resolution = state.resolution) => "Year " + (Math.floor(month / 12) + 1) + " · " + (resolution === "quarter" ? "Q" + (Math.floor((month % 12) / 3) + 1) : "Month " + (month % 12 + 1));
  const quarterEnd = (month) => Math.floor(month / 3) * 3 + 2;
  const state = {resolution: "quarter", cursor: 35, highlight: null, playing: false, buy: 2, use: 35, mode: "ccbt", preset: "equal", shares: Array(7).fill(0), selected: 2};
  const periods = () => state.resolution === "quarter" ? Array.from({length: 12}, (_, i) => i * 3 + 2) : Array.from({length: 36}, (_, i) => i);
  let playTimer = null;
  let announceTimer = null;
  let allocationAnnounceTimer = null;
  let rowSignature = "";
  let lastPurchase = null;

  function equalShares(month) {
    const ids = active(month), shares = Array(7).fill(0);
    ids.forEach(i => { shares[i] = 1 / ids.length; });
    return shares;
  }
  function marketShares(month) {
    const o = at(month);
    return o.weights.map((w, i) => w * (o.prices[i] || 0) / o.ccbt);
  }
  function rebalance(shares, id, value, ids) {
    const next = Array(7).fill(0);
    if (!ids.includes(id)) return shares.slice();
    if (ids.length === 1) { next[id] = 1; return next; }
    const v = Math.max(0, Math.min(1, value));
    next[id] = v;
    const others = ids.filter(i => i !== id), rest = others.reduce((s, i) => s + shares[i], 0);
    others.forEach(i => { next[i] = rest > EPS ? (1 - v) * shares[i] / rest : (1 - v) / others.length; });
    const correction = 1 - next.reduce((a, b) => a + b, 0);
    next[others[others.length - 1]] = Math.max(0, next[others[others.length - 1]] + correction);
    return next;
  }
  function purchase(amount, mode, month) {
    const cc = mode === "usd" ? amount / at(month).ccbt : amount;
    return {ccbt: cc, cost: cc * at(month).ccbt};
  }
  function allocationResult(ccbt, month, shares) {
    const o = at(month);
    const tokens = shares.map((a, i) => o.prices[i] > 0 ? ccbt * a * o.ccbt / o.prices[i] : 0);
    return {tokens, totalTokens: tokens.reduce((a, b) => a + b, 0), equivalent: ccbt * o.ccbt};
  }
  function notice(message = "") {
    const n = $("#allocation-date-notice"); n.textContent = message; n.hidden = !message;
  }
  function refreshShares() {
    const ids = active(state.use);
    if (state.preset === "equal") state.shares = equalShares(state.use);
    else if (state.preset === "market") state.shares = marketShares(state.use);
    else {
      const next = state.shares.map((v, i) => ids.includes(i) ? v : 0);
      const sum = next.reduce((a, b) => a + b, 0);
      state.shares = sum > EPS ? next.map(v => v / sum) : equalShares(state.use);
    }
    if (!ids.includes(state.selected)) state.selected = ids[0];
  }
  state.shares = equalShares(state.use);

  // Shared, zero-based time axes. Quarterly points are end-of-quarter snapshots.
  function makePlot(container, kind) {
    const width = Math.max(260, Math.round(container.getBoundingClientRect().width));
    const small = width < 420;
    const height = kind === "reference" ? (small ? 224 : 250) : (small ? 228 : 250);
    const margin = {left: kind === "usage" ? 33 : 34, right: 13, top: 12, bottom: 49};
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const points = periods();
    const maxY = kind === "usage" ? 1 : kind === "price" ? 8 : 4;
    const x = (idx) => margin.left + idx / (points.length - 1) * plotW;
    const y = (v) => margin.top + (1 - v / maxY) * plotH;
    const svg = svgNode("svg", {viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": `${container.id}-title ${container.id}-desc`});
    const title = kind === "usage" ? "Fictional model usage shares across three years" : kind === "price" ? "Fictional model-token prices across three years" : "Usage-weighted CCBT price across three years";
    svg.append(svgNode("title", {id: `${container.id}-title`}, title));
    svg.append(svgNode("desc", {id: `${container.id}-desc`}, `Selected: ${periodLabel(state.cursor)}. Models enter and leave the fictional segment. Use the Inspect a period slider or the data table for numeric values.`));
    const ink = kind === "reference" ? "#bec9cd" : "#64727c";
    const grid = svgNode("g", {"aria-hidden": "true"});
    const ticks = kind === "usage" ? [0, .25, .5, .75, 1] : kind === "price" ? [0, 2, 4, 6, 8] : [0, 1, 2, 3, 4];
    ticks.forEach(v => {
      grid.append(svgNode("line", {x1: margin.left, x2: width - margin.right, y1: y(v), y2: y(v), class: "chart-grid-line"}));
      grid.append(svgNode("text", {x: margin.left - 7, y: y(v) + 3, "text-anchor": "end", fill: ink, class: "chart-axis-label"}, kind === "usage" ? Math.round(v * 100) + "%" : "$" + v));
    });
    for (let year = 1; year <= 3; year++) {
      const idxs = points.map((m, i) => Math.floor(m / 12) + 1 === year ? i : -1).filter(i => i >= 0);
      grid.append(svgNode("text", {x: (x(idxs[0]) + x(idxs[idxs.length - 1])) / 2, y: height - 4, fill: ink, "text-anchor": "middle", class: "chart-year-label"}, "YEAR " + year));
      if (year < 3) {
        const end = idxs[idxs.length - 1];
        grid.append(svgNode("line", {x1: (x(end) + x(end + 1)) / 2, x2: (x(end) + x(end + 1)) / 2, y1: margin.top, y2: y(0) + 8, class: "chart-year-line"}));
      }
    }
    points.forEach((month, idx) => {
      let show = true;
      if (state.resolution === "month") show = small ? idx % 6 === 0 || idx === 35 : (idx % 3 === 0 && idx !== 33) || idx === 35;
      if (!show) return;
      const label = state.resolution === "quarter" ? "Q" + (Math.floor(month % 12 / 3) + 1) : "M" + (month % 12 + 1);
      grid.append(svgNode("text", {x: x(idx), y: y(0) + 19, "text-anchor": "middle", fill: ink, class: "chart-axis-label"}, label));
    });
    svg.append(grid);
    container._timePlot = {width, left: margin.left, plotW, points};
    return {svg, width, height, x, y, points, margin, small, kind};
  }
  const pathPoints = (values) => values.map((p, i) => (i ? "L" : "M") + p[0].toFixed(3) + "," + p[1].toFixed(3)).join(" ");
  function drawCursor(plot) {
    const idx = plot.points.indexOf(state.cursor);
    if (idx < 0) return;
    plot.svg.append(svgNode("line", {x1: plot.x(idx), x2: plot.x(idx), y1: plot.margin.top, y2: plot.y(0), class: "time-cursor-line", "aria-hidden": "true"}));
  }
  function drawUsage() {
    const container = $("#time-usage-chart"), plot = makePlot(container, "usage");
    const lower = Array(plot.points.length).fill(0);
    models.forEach((model, id) => {
      const upper = lower.map((v, j) => v + at(plot.points[j]).weights[id]);
      const pts = upper.map((v, j) => [plot.x(j), plot.y(v)]).concat(lower.map((v, j) => [plot.x(j), plot.y(v)]).reverse());
      const path = svgNode("path", {d: pathPoints(pts) + " Z", fill: model.color, class: "time-area-path", "data-model-series": id, opacity: state.highlight === null || state.highlight === id ? 1 : .19});
      path.append(svgNode("title", {}, `${model.name}: ${fmt(at(state.cursor).weights[id] * 100, 2)}% at ${periodLabel(state.cursor)}.`));
      plot.svg.append(path);
      for (let j = 0; j < lower.length; j++) lower[j] = upper[j];
    });
    drawCursor(plot);
    container.replaceChildren(plot.svg);
  }
  function drawPrices() {
    const container = $("#time-price-chart"), plot = makePlot(container, "price");
    models.forEach((model, id) => {
      let run = [];
      const flush = () => {
        if (!run.length) return;
        const path = svgNode("path", {d: pathPoints(run), stroke: model.color, class: "time-line-path", "data-model-series": id, opacity: state.highlight === null || state.highlight === id ? 1 : .16});
        path.append(svgNode("title", {}, model.name + ": fictional standardized token prices. No line is drawn outside eligibility."));
        plot.svg.append(path);
        if (run.length === 1) plot.svg.append(svgNode("circle", {cx: run[0][0], cy: run[0][1], r: 2, fill: model.color}));
        run = [];
      };
      plot.points.forEach((month, idx) => {
        const p = at(month).prices[id];
        if (p === null) flush(); else run.push([plot.x(idx), plot.y(p)]);
      });
      flush();
    });
    drawCursor(plot);
    const selectedIdx = plot.points.indexOf(state.cursor);
    models.forEach((model, i) => {
      const p = at(state.cursor).prices[i];
      if (p !== null) {
        const c = svgNode("circle", {cx: plot.x(selectedIdx), cy: plot.y(p), r: 3.2, fill: model.color, stroke: "white", "stroke-width": 1.2, "data-model-series": i, opacity: state.highlight === null || state.highlight === i ? 1 : .2});
        c.append(svgNode("title", {}, model.name + ": " + quote(p) + " per million tokens"));
        plot.svg.append(c);
      }
    });
    container.replaceChildren(plot.svg);
  }
  function drawReference() {
    const container = $("#time-reference-chart"), plot = makePlot(container, "reference");
    const pts = plot.points.map((month, idx) => [plot.x(idx), plot.y(at(month).ccbt)]);
    plot.svg.append(svgNode("path", {d: pathPoints(pts.concat([[plot.x(pts.length - 1), plot.y(0)], [plot.x(0), plot.y(0)]])) + " Z", fill: "#ffffff", opacity: ".045"}));
    plot.svg.append(svgNode("path", {d: pathPoints(pts), class: "time-line-path", stroke: "#f7f6f1", style: "stroke-width:3"}));
    drawCursor(plot);
    const idx = plot.points.indexOf(state.cursor);
    plot.svg.append(svgNode("circle", {cx: plot.x(idx), cy: plot.y(at(state.cursor).ccbt), r: 4.5, fill: "#101820", stroke: "#e0b48e", "stroke-width": 2}));
    container.replaceChildren(plot.svg);
  }
  function buildLegend() {
    const root = $("#time-model-legend");
    models.forEach((model, i) => {
      const button = element("button"); button.type = "button"; button.dataset.highlight = i;
      button.style.setProperty("--model-color", model.color); button.setAttribute("aria-pressed", "false");
      const name = element("span", "time-legend-model"); name.append(element("i", "time-swatch"), document.createTextNode(model.name));
      const value = element("span"); value.dataset.legendValue = i;
      button.append(name, value); root.append(button);
      button.addEventListener("click", () => { state.highlight = state.highlight === i ? null : i; renderExplorer(false); });
    });
  }
  function renderLegend() {
    models.forEach((model, i) => {
      const button = $(`[data-highlight="${i}"]`), w = at(state.cursor).weights[i];
      button.setAttribute("aria-pressed", String(state.highlight === i));
      button.classList.toggle("is-inactive", w === 0);
      $(`[data-legend-value="${i}"]`).textContent = w ? fmt(w * 100, 1) + "%" : "Outside";
      button.setAttribute("aria-label", `${model.name}, ${w ? fmt(w * 100, 2) + "% of usage" : "outside the segment"} at ${periodLabel(state.cursor)}. ${state.highlight === i ? "Clear highlight" : "Highlight without changing weights"}.`);
    });
  }
  function renderEquation() {
    const o = at(state.cursor), root = $("#time-equation-terms"), ids = active(state.cursor);
    root.style.setProperty("--term-count", String(ids.length));
    root.replaceChildren();
    ids.forEach(i => {
      const model = models[i], term = element("div", "time-equation-term"); term.style.setProperty("--model-color", model.color);
      const heading = element("span", "term-model"); heading.append(element("i", "time-swatch"), document.createTextNode(model.name));
      term.append(heading, element("span", "term-inputs", "$" + fmt(o.prices[i]) + " × " + fmt(o.weights[i] * 100, 1) + "%"), element("strong", "term-value", quote(o.prices[i] * o.weights[i])));
      root.append(term);
    });
    text("time-equation-total", "= " + quote(o.ccbt));
    text("time-reference-price", quote(o.ccbt));
    text("time-reference-date", periodLabel(state.cursor) + " · Fictional");
    const tbody = $("#time-data-body"); tbody.replaceChildren();
    models.forEach((m, i) => {
      const tr = element("tr");
      const td = element("td"); td.style.setProperty("--model-color", m.color); td.append(element("i", "time-swatch"), document.createTextNode(m.name));
      tr.append(td, element("td", "", o.prices[i] === null ? "Outside segment" : quote(o.prices[i])), element("td", "", fmt(o.weights[i] * 100, 4) + "%"), element("td", "", quote(o.weights[i] * (o.prices[i] || 0))), element("td", "", o.prices[i] === null ? "—" : fmt(o.prices[i] / o.ccbt, 4)));
      tbody.append(tr);
    });
    text("time-table-caption", periodLabel(state.cursor) + " · Fictional prices and weights · Contributions are USD / 1M CCBT");
  }
  function renderStats() {
    const root = $("#time-reference-stats"), first = at(2).ccbt, end = at(35).ccbt;
    root.replaceChildren();
    [["Opening reference", quote(first)], ["Closing reference", quote(end)], ["Change over this scenario", fmt((end / first - 1) * 100, 1) + "%"]].forEach(([label, value]) => {
      const n = element("div"); n.append(element("span", "", label), document.createTextNode(value)); root.append(n);
    });
  }
  function announceExplorer() {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { text("time-announcement", `${periodLabel(state.cursor)}: ${active(state.cursor).length} qualifying models; CCBT ${quote(at(state.cursor).ccbt)} per million.`); }, 260);
  }
  function renderExplorer(announce = true) {
    const ps = periods();
    $("#time-cursor").max = String(ps.length - 1); $("#time-cursor").value = String(ps.indexOf(state.cursor));
    $("#time-cursor").setAttribute("aria-valuetext", periodLabel(state.cursor));
    text("time-period", periodLabel(state.cursor));
    text("time-frequency-note", state.resolution === "quarter" ? "3 years · 12 quarter-end snapshots" : "3 years · 36 month-end snapshots");
    $$('[data-time-resolution]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.timeResolution === state.resolution)));
    drawUsage(); drawPrices(); drawReference(); renderLegend(); renderEquation();
    if (announce && !state.playing) announceExplorer();
  }
  function stopPlaying() {
    clearInterval(playTimer); playTimer = null; state.playing = false;
    $("#time-play").setAttribute("aria-pressed", "false"); $("#time-play").innerHTML = '<span aria-hidden="true">▶</span> Play the span';
  }
  function jump(month, manual = true) {
    if (manual) stopPlaying();
    state.cursor = state.resolution === "quarter" ? quarterEnd(month) : month;
    renderExplorer();
  }
  function togglePlay() {
    if (state.playing) { stopPlaying(); announceExplorer(); return; }
    const ps = periods();
    if (state.cursor === ps[ps.length - 1]) jump(ps[0]);
    state.playing = true;
    $("#time-play").setAttribute("aria-pressed", "true"); $("#time-play").innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    playTimer = setInterval(() => {
      const p = periods(), idx = p.indexOf(state.cursor);
      if (idx >= p.length - 1) { stopPlaying(); announceExplorer(); return; }
      jump(p[idx + 1], false);
      if (idx + 1 === p.length - 1) { stopPlaying(); announceExplorer(); }
    }, state.resolution === "quarter" ? 950 : 500);
  }
  function attachChartScrub(container) {
    let dragging = false;
    const inspect = (clientX) => {
      const plot = container._timePlot; if (!plot) return;
      const rect = container.getBoundingClientRect();
      const scaled = (clientX - rect.left) / rect.width * plot.width;
      const idx = Math.max(0, Math.min(plot.points.length - 1, Math.round((scaled - plot.left) / plot.plotW * (plot.points.length - 1))));
      if (state.cursor !== plot.points[idx]) jump(plot.points[idx]);
    };
    container.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      stopPlaying(); inspect(e.clientX);
      if (e.pointerType !== "touch") { dragging = true; container.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    container.addEventListener("pointermove", e => { if (dragging) inspect(e.clientX); });
    container.addEventListener("pointerup", () => { dragging = false; });
    container.addEventListener("pointercancel", () => { dragging = false; });
    container.addEventListener("lostpointercapture", () => { dragging = false; });
  }

  // Allocation controls. A quantity is held between dates; dollar equivalents vary.
  function dateOptions() {
    const ps = periods();
    [["allocation-purchase", state.buy, false], ["allocation-consumption", state.use, true]].forEach(([id, selected, consumption]) => {
      const select = document.getElementById(id); select.replaceChildren();
      ps.forEach(month => {
        const option = element("option", "", periodLabel(month)); option.value = String(month);
        option.selected = month === selected; option.disabled = consumption && month < state.buy;
        select.append(option);
      });
    });
  }
  function readPurchase() {
    const input = $("#allocation-amount"), raw = input.value.trim(), amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount < 0 || amount > 1e12) {
      input.setAttribute("aria-invalid", "true");
      const error = $("#allocation-error"); error.textContent = "Enter a finite, non-negative amount up to 1 trillion in the selected input units. No conversion is shown while the amount is invalid."; error.hidden = false;
      return null;
    }
    input.removeAttribute("aria-invalid"); $("#allocation-error").hidden = true;
    return purchase(amount, state.mode, state.buy);
  }
  function updateModeControls() {
    $$('[data-allocation-mode]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.allocationMode === state.mode)));
    text("allocation-amount-label", state.mode === "ccbt" ? "02 / Million CCBT" : "02 / Dollar budget (USD)");
    text("allocation-amount-prefix", state.mode === "ccbt" ? "M" : "$");
    text("allocation-amount-help", state.mode === "ccbt" ? "Holds the CCBT quantity fixed as the purchase date changes." : "Holds the initial dollar budget fixed as the purchase date changes.");
  }
  function selectModel(id, announce = false) {
    state.selected = id;
    $$(".allocation-model-row").forEach(row => row.classList.toggle("is-selected", Number(row.dataset.allocationModel) === id));
    $$("[data-donut-model]").forEach(path => { path.style.opacity = Number(path.dataset.donutModel) === id ? "1" : ".78"; path.setAttribute("aria-pressed", String(Number(path.dataset.donutModel) === id)); });
    const select = $("#allocation-all-model"); select.value = String(id);
    renderConversion(lastPurchase);
    if (announce) text("allocation-announcement", models[id].name + " conversion selected.");
  }
  function buildAllocationRows() {
    const ids = active(state.use), sig = ids.join(",");
    if (sig === rowSignature) return;
    rowSignature = sig;
    const root = $("#allocation-model-rows"); root.replaceChildren();
    const select = $("#allocation-all-model"); select.replaceChildren();
    ids.forEach(id => {
      const model = models[id], row = element("div", "allocation-model-row");
      row.dataset.allocationModel = String(id); row.style.setProperty("--model-color", model.color);
      const summary = element("div", "allocation-model-summary");
      const name = element("label", "allocation-model-id"); name.htmlFor = "allocation-slider-" + id; name.append(element("i", "time-swatch"), document.createTextNode(model.name));
      const price = element("span", "model-price-info"); price.dataset.allocationPrice = String(id); summary.append(name, price);
      const inputs = element("div", "allocation-share-input");
      const slider = element("input"); slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.step = ".1"; slider.id = "allocation-slider-" + id;
      slider.setAttribute("aria-label", model.name + " allocation percentage"); slider.dataset.allocationRange = String(id);
      const percent = element("div", "allocation-share-number");
      const num = element("input"); num.type = "number"; num.min = "0"; num.max = "100"; num.step = "any"; num.inputMode = "decimal"; num.id = "allocation-percent-" + id;
      num.setAttribute("aria-label", model.name + " allocation percent, 0 to 100"); num.dataset.allocationPercent = String(id);
      percent.append(num, element("span", "", "%")); inputs.append(slider, percent);
      const result = element("div", "allocation-model-tokens"); const count = element("strong"); count.dataset.allocationTokens = String(id);
      const cc = element("small"); cc.dataset.allocationBalance = String(id); result.append(count, cc);
      const inputError = element("p", "allocation-share-error", "Enter a percentage from 0 to 100. The displayed result still uses the last valid share.");
      inputError.hidden = true; inputError.setAttribute("role", "alert");
      row.append(summary, inputs, result, inputError); root.append(row);
      const opt = element("option", "", model.name); opt.value = String(id); select.append(opt);
      slider.addEventListener("input", () => {
        notice(); state.preset = "custom"; state.selected = id;
        state.shares = rebalance(state.shares, id, Number(slider.value) / 100, active(state.use));
        renderAllocator(slider);
      });
      num.addEventListener("input", () => {
        const val = Number(num.value);
        if (num.value.trim() === "" || !Number.isFinite(val) || val < 0 || val > 100) {
          num.setAttribute("aria-invalid", "true"); inputError.hidden = false; $("#allocation-export").disabled = true; return;
        }
        inputError.hidden = true;
        num.removeAttribute("aria-invalid"); notice(); state.preset = "custom"; state.selected = id;
        state.shares = rebalance(state.shares, id, val / 100, active(state.use)); renderAllocator(num);
      });
      num.addEventListener("change", () => {
        if (num.getAttribute("aria-invalid") === "true") {
          num.value = (state.shares[id] * 100).toFixed(2); num.removeAttribute("aria-invalid"); inputError.hidden = true;
          notice("Allocation percentages must be between 0 and 100. The last valid share has been restored.");
        }
        renderAllocator();
      });
    });
  }
  function circlePoint(cx, cy, r, angle) { return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]; }
  function donutPath(start, end, cx = 140, cy = 140, outer = 120, inner = 82) {
    // Separate arcs handle a 100% slice without a degenerate same-endpoint arc.
    if (end - start >= 2 * Math.PI - 1e-8) {
      return `M ${cx + outer} ${cy} A ${outer} ${outer} 0 1 1 ${cx - outer} ${cy} A ${outer} ${outer} 0 1 1 ${cx + outer} ${cy} M ${cx + inner} ${cy} A ${inner} ${inner} 0 1 0 ${cx - inner} ${cy} A ${inner} ${inner} 0 1 0 ${cx + inner} ${cy} Z`;
    }
    const [x1,y1] = circlePoint(cx,cy,outer,start), [x2,y2] = circlePoint(cx,cy,outer,end), [x3,y3] = circlePoint(cx,cy,inner,end), [x4,y4] = circlePoint(cx,cy,inner,start);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
  }
  function renderDonut(p) {
    const root = $("#allocation-donut"), svg = svgNode("svg", {viewBox: "0 0 280 280", role: "group", "aria-label": "Your CCBT allocation. Select a model slice to inspect its conversion."});
    svg.append(svgNode("circle", {cx:140, cy:140, r:101, fill:"none", stroke:"#eeeee7", "stroke-width":38}));
    let start = -Math.PI / 2;
    const ids = active(state.use);
    ids.forEach(id => {
      const share = state.shares[id]; if (share <= 1e-12) return;
      const end = start + share * Math.PI * 2, path = svgNode("path", {d:donutPath(start,end), fill:models[id].color, stroke:"#fff", "stroke-width":2, "fill-rule":"evenodd", tabindex:0, role:"button", "data-donut-model":id, "aria-pressed":String(state.selected === id), "aria-label":`${models[id].name}: ${fmt(share*100,2)}% of your CCBT. Inspect this conversion.`, opacity:state.selected === id ? 1 : .78});
      path.append(svgNode("title", {}, `${models[id].name} · ${fmt(share*100,2)}% of your balance`));
      path.addEventListener("click", () => selectModel(id, true));
      path.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectModel(id, true); } });
      svg.append(path);
      if (share >= .09) {
        const [x,y] = circlePoint(140,140,101,(start+end)/2);
        svg.append(svgNode("text", {x,y:y+4,"text-anchor":"middle",fill:"#fff","font-family":"var(--sans)","font-size":12,"font-weight":600,"pointer-events":"none","aria-hidden":"true"}, models[id].id));
      }
      start = end;
    });
    const balance = p ? quantity(p.ccbt) : "—";
    const label = svgNode("text", {x:140,y:140,"text-anchor":"middle",class:"donut-center-value","aria-hidden":"true"}, balance);
    if (balance.length > 9) label.setAttribute("style", "font-size:27px");
    svg.append(label, svgNode("text", {x:140,y:161,"text-anchor":"middle",class:"donut-center-label","aria-hidden":"true"}, "CCBT TO ALLOCATE"));
    svg.append(svgNode("text", {x:140,y:180,"text-anchor":"middle",class:"donut-center-label","aria-hidden":"true"}, "100% assigned"));
    root.replaceChildren(svg);
  }
  function renderConversion(p) {
    const id = state.selected, o = at(state.use), h = $("#allocation-conversion-title");
    h.replaceChildren(); h.style.setProperty("--model-color", models[id].color); h.append(element("i", "time-swatch"), document.createTextNode(models[id].name + " at " + periodLabel(state.use)));
    if (!p) {
      text("allocation-conversion-equation", "Enter a valid amount to calculate this conversion.");
      text("allocation-conversion-note", "No tokens are calculated while the amount is invalid."); text("allocation-total-tokens", "—"); return;
    }
    const result = allocationResult(p.ccbt,state.use,state.shares), allocated = p.ccbt * state.shares[id], ratio = o.prices[id] / o.ccbt;
    text("allocation-conversion-equation", `${quantity(allocated,3)} CCBT ÷ ${fmt(ratio,4)} CCBT/token = ${quantity(result.tokens[id],3)} tokens`);
    text("allocation-conversion-note", `Conversion price = ${quote(o.prices[id])} per 1M model tokens ÷ ${quote(o.ccbt)} per 1M CCBT. Your ${fmt(state.shares[id]*100,2)}% allocation is independent of this model’s ${fmt(o.weights[id]*100,2)}% segment usage.`);
    text("allocation-total-tokens", quantity(result.totalTokens,3));
  }
  function renderAllocator(origin = null) {
    buildAllocationRows(); updateModeControls();
    text("allocation-entry-price", quote(at(state.buy).ccbt) + " / 1M CCBT");
    const p = readPurchase(); lastPurchase = p;
    const result = p ? allocationResult(p.ccbt,state.use,state.shares) : null;
    text("allocation-initial-usd", p ? money(p.cost) : "—");
    text("allocation-initial-date", periodLabel(state.buy) + " · purchase reference");
    text("allocation-ccbt-balance", p ? quantity(p.ccbt) + " CCBT" : "—");
    text("allocation-equivalent", p ? money(result.equivalent) : "—");
    text("allocation-equivalent-date", periodLabel(state.use) + " · " + quote(at(state.use).ccbt) + " / 1M CCBT");
    const ids = active(state.use);
    text("allocation-available-label", periodLabel(state.use) + " · Available models: " + ids.map(i => models[i].id).join(" · "));
    $$('[data-allocation-preset]').forEach(b => b.setAttribute("aria-pressed", String(state.preset === b.dataset.allocationPreset)));
    const presetNote = state.preset === "market" ? "Market token mix: spend shares are price-weighted so the resulting token shares match segment usage. They are not the usage percentages themselves." : state.preset === "equal" ? "Equal CCBT: each available model receives the same share of purchasing balance—not the same token count." : "Custom basket: dates preserve surviving allocations. Exited models release their share; newly available models start at zero.";
    text("allocation-preset-note", presetNote);
    ids.forEach(id => {
      const row = $(`[data-allocation-model="${id}"]`), o = at(state.use), price = $(`[data-allocation-price="${id}"]`);
      row.classList.toggle("is-selected", state.selected === id);
      price.replaceChildren(element("span", "", "$" + fmt(o.prices[id]) + " / 1M tokens"), element("br"), element("span", "", fmt(o.prices[id]/o.ccbt,3) + " CCBT / token"));
      const range = $(`[data-allocation-range="${id}"]`), num = $(`[data-allocation-percent="${id}"]`);
      if (range !== origin) range.value = String(state.shares[id]*100);
      if (num !== origin) { num.value = (state.shares[id]*100).toFixed(2); num.removeAttribute("aria-invalid"); $(".allocation-share-error", row).hidden = true; }
      range.setAttribute("aria-valuetext", fmt(state.shares[id]*100,2) + "% of your CCBT balance");
      $(`[data-allocation-tokens="${id}"]`).textContent = p ? quantity(result.tokens[id],3) : "—";
      $(`[data-allocation-balance="${id}"]`).textContent = p ? quantity(p.ccbt*state.shares[id]) + " CCBT" : "Invalid amount";
    });
    $("#allocation-all-model").value = String(state.selected);
    $("#allocation-export").disabled = !p;
    renderDonut(p); renderConversion(p);
    clearTimeout(allocationAnnounceTimer);
    if (p) allocationAnnounceTimer = setTimeout(() => { text("allocation-announcement", `${quantity(p.ccbt)} CCBT allocated at ${periodLabel(state.use)}, across ${ids.length} available models. ${models[state.selected].name}: ${quantity(result.tokens[state.selected],3)} tokens.`); }, 350);
  }

  // Connect the controls without coupling the consumption basket to market weights.
  buildLegend(); renderStats(); dateOptions();
  $("#time-cursor").addEventListener("input", e => jump(periods()[Number(e.target.value)]));
  $("#time-play").addEventListener("click", togglePlay);
  $$('[data-time-jump]').forEach(b => b.addEventListener("click", () => jump(Number(b.dataset.timeJump))));
  $$('[data-time-resolution]').forEach(b => b.addEventListener("click", () => {
    stopPlaying(); state.resolution = b.dataset.timeResolution;
    if (state.resolution === "quarter") { state.cursor = quarterEnd(state.cursor); state.buy = quarterEnd(state.buy); state.use = quarterEnd(state.use); }
    dateOptions(); refreshShares(); renderExplorer(); renderAllocator(); notice();
  }));
  ["time-usage-chart","time-price-chart","time-reference-chart"].forEach(id => attachChartScrub(document.getElementById(id)));
  $("#allocation-purchase").addEventListener("change", e => {
    state.buy = Number(e.target.value); notice();
    if (state.use < state.buy) { state.use = state.buy; notice("Consumption was moved to the purchase date; consumption cannot precede purchase in this example."); refreshShares(); }
    dateOptions(); renderAllocator();
  });
  $("#allocation-consumption").addEventListener("change", e => {
    state.use = Math.max(state.buy, Number(e.target.value)); notice(); refreshShares(); dateOptions(); renderAllocator();
  });
  $("#allocation-use-cursor").addEventListener("click", () => {
    state.use = state.cursor; notice();
    if (state.buy > state.use) { state.buy = state.use; notice("Purchase was moved to the explored period so both dates remain in order."); }
    refreshShares(); dateOptions(); renderAllocator();
  });
  $("#allocation-amount").addEventListener("input", () => renderAllocator());
  $$('[data-allocation-mode]').forEach(b => b.addEventListener("click", () => {
    if (state.mode === b.dataset.allocationMode) return;
    const p = readPurchase(); state.mode = b.dataset.allocationMode;
    if (p) $("#allocation-amount").value = String(Number((state.mode === "usd" ? p.cost : p.ccbt).toPrecision(13)));
    renderAllocator();
  }));
  $$('[data-allocation-preset]').forEach(b => b.addEventListener("click", () => { state.preset = b.dataset.allocationPreset; notice(); refreshShares(); renderAllocator(); }));
  $("#allocation-all-model").addEventListener("change", e => selectModel(Number(e.target.value), true));
  $("#allocation-all-button").addEventListener("click", () => {
    state.selected = Number($("#allocation-all-model").value); state.preset = "custom";
    state.shares = Array(7).fill(0); state.shares[state.selected] = 1; notice(); renderAllocator();
  });
  $("#time-export").addEventListener("click", () => {
    const rows = [["fictional", "segment", "year", "month", "quarter", "is_quarter_end", "model", "eligible", "price_usd_per_1m_tokens", "usage_share", "contribution_usd_per_1m_ccbt", "ccbt_usd_per_1m", "ccbt_per_model_token"]];
    observations.forEach(o => models.forEach((m,i) => rows.push([true,"Representative segment",o.year,o.monthInYear,Math.floor((o.month%12)/3)+1,o.month%3===2,m.name,o.weights[i]>0,o.prices[i],o.weights[i],o.weights[i]*(o.prices[i]||0),o.ccbt,o.prices[i]===null?"":o.prices[i]/o.ccbt])));
    saveCSV("fictional-ccbt-three-year-scenario.csv",rows);
  });
  $("#allocation-export").addEventListener("click", () => {
    const p = readPurchase(); if (!p || $('[data-allocation-percent][aria-invalid="true"]', allocator)) return;
    const o = at(state.use), r = allocationResult(p.ccbt,state.use,state.shares);
    const rows = [["fictional", "segment", "purchase_year", "purchase_month", "consumption_year", "consumption_month", "entry_price_usd_per_1m_ccbt", "initial_outlay_usd", "balance_million_ccbt", "consumption_price_usd_per_1m_ccbt", "reference_equivalent_usd", "model", "model_price_usd_per_1m_tokens", "segment_usage_share", "your_ccbt_allocation_share", "allocated_million_ccbt", "ccbt_per_model_token", "million_model_tokens", "assumption"]];
    active(state.use).forEach(i => rows.push([true,"Representative segment",at(state.buy).year,at(state.buy).monthInYear,o.year,o.monthInYear,at(state.buy).ccbt,p.cost,p.ccbt,o.ccbt,r.equivalent,models[i].name,o.prices[i],o.weights[i],state.shares[i],p.ccbt*state.shares[i],o.prices[i]/o.ccbt,r.tokens[i],"Illustrative prepaid index-linked entitlement at entry spot reference; no fees or forward pricing; no actual delivery guarantee"]));
    saveCSV("fictional-ccbt-allocation.csv",rows);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopPlaying(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.playing) { stopPlaying(); announceExplorer(); } });
  let resizeTimer;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawUsage(); drawPrices(); drawReference(); },100); };
  if ("ResizeObserver" in window) { const ro = new ResizeObserver(onResize); ro.observe(explorer); } else window.addEventListener("resize",onResize);

  renderExplorer(false); renderAllocator();
  // Read-only diagnostics for reproducibility and automated tests; no network calls.
  window.StandardBasisTime = Object.freeze({
    data: source,
    math: Object.freeze({purchase, allocationResult, marketShares, rebalance, equalShares}),
    getState: () => ({...state, shares: state.shares.slice()})
  });
})();
