/* Standard Basis — progressive enhancement without frameworks or network dependencies.
 * Published observations and the fictional calculator use separate data paths.
 */
(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const node = (tag, className = "", text = null) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== null) n.textContent = String(text);
    return n;
  };
  const format = (value, min = 2, max = min) => Number(value).toLocaleString("en-US", {
    minimumFractionDigits: min, maximumFractionDigits: max
  });
  const money = (value) => "$" + format(value, 2, value < 0.01 ? 6 : 4);
  const ratio = (value) => (value >= 1000 ? value.toExponential(1).replace("e+", "e") : format(value, 2)) + "×";
  const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
  const validIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const dateLabel = (value, time = false) => {
    const date = new Date(value.length === 10 ? value + "T00:00:00Z" : value);
    if (!Number.isFinite(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
      ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {})
    }).format(date) + (time ? " UTC" : "");
  };
  const safeUrl = (value, allowRelative = false) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const absolute = new URL(value, location.href);
      if (["https:", "http:"].includes(absolute.protocol)) {
        if (!allowRelative && !/^https?:\/\//i.test(value)) return null;
        return value;
      }
      if (allowRelative && absolute.protocol === "file:" && !/^[a-z]+:/i.test(value) && !value.startsWith("//")) return value;
    } catch (_) { /* Malformed links are not rendered. */ }
    return null;
  };
  function addLink(parent, text, href, className = "text-link") {
    const a = node("a", (className || "text-link") + " jump-link", text);
    a.href = href;
    if (/^https?:\/\//.test(href)) a.rel = "noopener noreferrer";
    a.append(node("span", "", "↗"));
    a.lastChild.setAttribute("aria-hidden", "true");
    parent.append(a);
    return a;
  }
  function download(name, content, type = "text/plain;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = node("a");
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function csvCell(value) {
    let s = String(value ?? "");
    if (typeof value === "string" && /^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csv(rows) { return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"; }
  async function copyText(text, fallback) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      if (!fallback) return false;
      fallback.focus(); fallback.select();
      try { return document.execCommand("copy"); } catch (_) { return false; }
    }
  }

  // Keep links from earlier site versions useful after moving long-form content off Home.
  if (document.body.dataset.page === "index") {
    const movedSections = {
      "#ccbt": "ccbt.html#overview", "#applied": "benchmark.html#example",
      "#market": "market.html", "#delivery": "vision.html#delivery",
      "#data": "vision.html#path", "#participate": "participate.html",
      "#contact": "participate.html", "#inquiry": "participate.html#inquiry"
    };
    function followMovedSection() {
      const target = movedSections[location.hash];
      if (!target) return;
      const next = new URL(target, location.href);
      next.search = location.search;
      location.replace(next.href);
    }
    followMovedSection();
    window.addEventListener("hashchange", followMovedSection);
  }

  // Responsive navigation: no JavaScript means the ordinary link list stays visible.
  const toggle = $(".nav-toggle");
  const nav = $("#nav-links");
  if (toggle && nav) {
    toggle.hidden = false;
    function closeNav(restoreFocus = false) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      $("span", toggle).textContent = "+";
      if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      $("span", toggle).textContent = open ? "−" : "+";
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) closeNav(true);
    });
    const desktop = window.matchMedia("(min-width: 761px)");
    desktop.addEventListener("change", () => { if (desktop.matches) closeNav(); });
  }

  // Long-form contents navigation.
  const tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const id = "#" + visible[0].target.id;
      tocLinks.forEach((a) => {
        const active = a.getAttribute("href") === id;
        a.classList.toggle("is-active", active);
        if (active) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-110px 0px -58% 0px", threshold: 0 });
    tocLinks.forEach((a) => { const target = $(a.getAttribute("href")); if (target) observer.observe(target); });
  }

  function calculate(rows) {
    const total = rows.reduce((sum, r) => sum + r.usage, 0);
    const expenditure = rows.reduce((sum, r) => sum + r.price * r.usage, 0);
    if (!Number.isFinite(total) || !Number.isFinite(expenditure) || total <= 0 || expenditure <= 0) return null;
    const reference = expenditure / total;
    if (!Number.isFinite(reference) || reference <= 0) return null;
    const calculated = rows.map((r) => ({ ...r, weight: r.usage / total, relative: r.price / reference }));
    if (calculated.some((r) => !Number.isFinite(r.relative))) return null;
    return { reference, total, rows: calculated };
  }

  function relativeChart(container, result) {
    container.replaceChildren();
    const chart = node("div", "relative-chart");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", "Model prices relative to the common reference: " + result.rows.map((r) => `${r.name} ${ratio(r.relative)}`).join("; "));
    const maximum = Math.max(1.25, Math.ceil(Math.max(1, ...result.rows.map((r) => r.relative)) * 1.15 * 4) / 4);
    const referencePosition = 100 / maximum;
    const axis = node("div", "bar-axis");
    axis.setAttribute("aria-hidden", "true");
    axis.append(node("span", "axis-origin", "0×"));
    if (referencePosition >= 18 && referencePosition <= 80) {
      const ref = node("span", "axis-ref", "1.0× CCBT");
      ref.style.left = referencePosition + "%";
      axis.append(ref);
    }
    axis.append(node("span", "axis-max", format(maximum, maximum < 10 ? 1 : 0) + "×"));
    chart.append(axis);
    result.rows.forEach((r) => {
      const row = node("div", "bar-row");
      row.setAttribute("aria-hidden", "true");
      const track = node("div", "bar-track");
      track.style.setProperty("--reference", referencePosition + "%");
      const bar = node("span", "price-bar");
      bar.style.width = (r.relative / maximum * 100) + "%";
      track.append(bar);
      row.append(node("span", "bar-name", r.name), track, node("span", "bar-number", ratio(r.relative)));
      chart.append(row);
    });
    container.append(chart, node("p", "chart-note", "Dashed line: the common basis at 1×. Relative cost is not a quality ranking."));
  }

  function compositionChart(container, rows) {
    container.replaceChildren();
    const stack = node("div", "composition-stack");
    stack.setAttribute("aria-hidden", "true");
    const legend = node("dl", "composition-legend");
    rows.forEach((r, i) => {
      const segment = node("span", "key-" + i % 3);
      segment.style.width = (r.weight * 100) + "%";
      stack.append(segment);
      const item = node("div");
      const dt = node("dt");
      const marker = node("i", "model-key key-" + i % 3);
      marker.setAttribute("aria-hidden", "true");
      dt.append(marker, document.createTextNode(r.name));
      item.append(dt, node("dd", "", format(r.weight * 100, 1) + "%"));
      legend.append(item);
    });
    container.append(stack, legend);
  }

  /**
   * A literal geometric view of the usage-weighted mean.
   * Left: width = q_i / sum(q), height = p_i; area = w_i p_i.
   * Right: the contributions share a common height P, so each new width
   *        is w_i p_i / P. Each colored area is preserved between views.
   * Both plots have the same dimensions and price scale.
   * No visual value is ever fed into the research benchmark data.
   */
  function weightedVisual(container) {
    if (!container) return { update() {}, clear() {} };
    container.replaceChildren();
    const view = node("div", "weighted-visual");
    const drawings = node("div", "weighting-drawings");
    const makePlot = (kind, title) => {
      const figure = node("figure", "weight-figure " + kind);
      const heading = node("figcaption", "weight-plot-title", title);
      const chart = node("div", "weight-plot");
      chart.setAttribute("role", "img");
      const axis = node("div", "weight-y-axis");
      const ticks = [0, .5, 1].map((position) => {
        const tick = node("span"); tick.style.bottom = `${position * 100}%`;
        axis.append(tick); return tick;
      });
      const area = node("div", "weight-area");
      area.setAttribute("aria-hidden", "true");
      const grids = node("div", "weight-grids");
      [0, 50, 100].forEach((position) => {
        const line = node("i"); line.style.bottom = position + "%"; grids.append(line);
      });
      const bars = node("div", "weight-blocks");
      const rectangles = [0, 1, 2].map((i) => {
        const block = node("div", "weight-block key-" + i);
        bars.append(block); return block;
      });
      const mean = node("div", "weight-mean");
      mean.append(node("span", "", "Common price"));
      area.append(grids, bars, mean);
      chart.append(axis, area);
      const description = node("p", "weight-axis-caption");
      figure.append(heading, chart, description);
      return { figure, chart, rectangles, ticks, mean, description };
    };
    const prices = makePlot("weight-input-plot", "01 / Weight each model price");
    const combined = makePlot("weight-combined-plot", "02 / Combine into one common price");
    const arrow = node("span", "weight-flow-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    drawings.append(prices.figure, arrow, combined.figure);
    const equations = node("div", "weight-equations");
    const terms = [0, 1, 2].map((i) => {
      const term = node("div", "weight-term");
      const label = node("span", "weight-term-label");
      const marker = node("i", "model-key key-" + i); marker.setAttribute("aria-hidden", "true");
      label.append(marker, document.createTextNode("Model " + String.fromCharCode(65 + i)));
      const equation = node("div", "weight-term-math");
      equation.setAttribute("aria-hidden", "true");
      const price = node("span", "weight-term-price");
      const times = node("span", "math-operator", "×");
      const fraction = node("span", "math-fraction");
      const numerator = node("span"), denominator = node("span");
      fraction.append(numerator, denominator);
      const equal = node("span", "math-operator", "≈");
      const contribution = node("strong", "weight-term-contribution tone-" + i);
      equation.append(price, times, fraction, equal, contribution);
      const detail = node("span", "weight-term-detail");
      term.append(label, equation, detail);
      equations.append(term);
      return { term, price, numerator, denominator, contribution, detail };
    });
    const note = node("p", "weighting-note", "Same colors. Same areas. A single height. Contributions are in USD per 1M CCBT; displayed values are rounded.");
    view.append(drawings, equations, note);
    const empty = node("p", "chart-note", "Enter valid prices and positive usage to build the visual equation.");
    empty.hidden = true;
    container.append(view, empty);
    let initial = true;
    function tinyMoney(value, decimals = 4) {
      if (value > 0 && (value < .0001 || value >= 1e6)) return "$" + value.toExponential(2).replace("e+", "e");
      return "$" + format(value, decimals, decimals);
    }
    // Avoid zero-looking labels for small non-zero inputs.
    function inputLabel(value, decimals = 4) {
      if (value > 0 && (value < Math.pow(10, -decimals) || value >= 1e7)) return value.toExponential(2).replace("e+", "e");
      return format(value, 0, decimals);
    }
    return {
      clear() { view.hidden = true; empty.hidden = false; },
      update(result) {
        view.hidden = false; empty.hidden = true;
        const maxPrice = Math.max(...result.rows.filter((r) => r.weight > 0).map((r) => r.price));
        // Round the axis upward at the order of magnitude of the prices.
        const magnitude = Math.pow(10, Math.floor(Math.log10(maxPrice)));
        const ceiling = Math.ceil((maxPrice / magnitude) * 1.12 / .5) * .5 * magnitude;
        const meanHeight = result.reference / ceiling * 100;
        const contributions = result.rows.map((r) => r.price * r.weight);
        [prices, combined].forEach((plot) => {
          plot.ticks.forEach((tick, i) => { tick.textContent = tinyMoney(i * .5 * ceiling, ceiling >= 100 ? 0 : 2); });
          plot.mean.style.bottom = meanHeight + "%";
          plot.chart.dataset.axisMax = String(ceiling);
          plot.chart.dataset.reference = String(result.reference);
        });
        result.rows.forEach((r, i) => {
          const contribution = contributions[i];
          const input = prices.rectangles[i], output = combined.rectangles[i];
          input.style.width = `${r.weight * 100}%`;
          input.style.height = `${r.price / ceiling * 100}%`;
          output.style.width = `${contribution / result.reference * 100}%`;
          output.style.height = `${meanHeight}%`;
          // The dataset is useful for geometry tests and unobtrusive inspection.
          input.dataset.model = output.dataset.model = r.name;
          input.dataset.letter = output.dataset.letter = String.fromCharCode(65 + i);
          input.dataset.contribution = output.dataset.contribution = String(contribution);
          input.title = `${r.name}: ${format(r.weight * 100, 2)}% usage × ${money(r.price)} per 1M model tokens`;
          output.title = `${r.name}: ${tinyMoney(contribution)} contribution to the common price`;
          terms[i].price.textContent = "$" + (r.price > 0 && r.price < .0001 ? inputLabel(r.price) : format(r.price, 2, 4));
          terms[i].numerator.textContent = inputLabel(r.usage);
          terms[i].denominator.textContent = inputLabel(result.total);
          terms[i].contribution.textContent = tinyMoney(contribution);
          terms[i].detail.textContent = `${format(r.weight * 100, 2)}% of usage`;
          terms[i].term.setAttribute("aria-label", `${r.name}: price ${r.price} dollars per million tokens multiplied by usage share ${r.usage} divided by ${result.total}, contributes ${contribution} dollars per million CCBT.`);
        });
        prices.chart.setAttribute("aria-label", "Weighted-price areas. Each model's width is its share of usage and its height is its price. " + result.rows.map((r, i) => `${r.name}: ${format(r.weight * 100, 2)} percent usage, ${r.price} dollars per million tokens, contribution ${contributions[i]} dollars per million CCBT.`).join(" "));
        combined.chart.setAttribute("aria-label", `The same colored areas combined at a uniform height: the common price, ${result.reference} dollars per million CCBT. Segment widths now reflect price contributions, not usage shares.`);
        prices.description.textContent = "Width: share of total usage · Height: USD / 1M model tokens";
        combined.description.textContent = "Width: share of the common price · Total area is unchanged";
        // Initial rendering should not animate in from an empty chart.
        if (initial) {
          requestAnimationFrame(() => view.classList.add("is-ready"));
          initial = false;
        }
      }
    };
  }

  // Fictional inputs never enter SB_BENCHMARK or a published export.
  const calculator = $("#ccbt-calculator");
  if (calculator) {
    const prices = $$('[data-calc-price]', calculator);
    const usages = $$('[data-calc-usage]', calculator);
    [...prices, ...usages].forEach((field) => { field.disabled = false; });
    $("#reset-example").disabled = false;
    $("#export-example").disabled = false;
    const defaults = [{ price: 0.80, usage: 50 }, { price: 2.00, usage: 34 }, { price: 5.00, usage: 15 }];
    const weighted = weightedVisual($("#calc-weighted-visual"));
    let exampleResult = null;
    function updateExample() {
      const error = $("#calc-error");
      const fields = [...prices, ...usages];
      // Price steppers use $0.10. A manually typed, finer price remains valid.
      // Only ignore stepMismatch for prices; all numeric/range constraints still apply.
      const invalid = fields.filter((n) => n.value === "" || !Number.isFinite(n.valueAsNumber) ||
        n.validity.badInput || n.validity.rangeUnderflow || n.validity.rangeOverflow ||
        n.validity.valueMissing || (n.validity.stepMismatch && !prices.includes(n)));
      fields.forEach((n) => {
        if (invalid.includes(n)) n.setAttribute("aria-invalid", "true"); else n.removeAttribute("aria-invalid");
      });
      const rows = prices.map((p, i) => ({ name: "Model " + String.fromCharCode(65 + i), price: p.valueAsNumber, usage: usages[i].valueAsNumber }));
      exampleResult = invalid.length ? null : calculate(rows);
      if (!exampleResult) {
        error.hidden = false;
        error.textContent = invalid.length ? "Enter finite, non-negative prices and usage within the input limits." : "Enter some positive usage at a positive price. A zero-price reference has no relative conversion.";
        $("#calc-value").textContent = "—";
        weighted.clear();
        if ($("#calc-sum")) $("#calc-sum").textContent = "Review the inputs above.";
        $("#calc-equation").textContent = "The current inputs do not define a positive reference.";
        $("#calc-relative-chart").replaceChildren(node("p", "chart-note", "Relative prices appear when the inputs define a positive common reference."));
        $("#calc-composition-chart").replaceChildren(node("p", "chart-note", "Review the inputs above."));
        $("#export-example").disabled = true;
        return;
      }
      error.hidden = true;
      $("#export-example").disabled = false;
      $("#calc-value").textContent = money(exampleResult.reference);
      $("#calc-equation").textContent = "(" + rows.map((r) => `${format(r.price, 2, 4)} × ${format(r.usage, 0, 4)}`).join(" + ") + ") ÷ " + format(exampleResult.total, 0, 4);
      relativeChart($("#calc-relative-chart"), exampleResult);
      compositionChart($("#calc-composition-chart"), exampleResult.rows);
      weighted.update(exampleResult);
      const sum = $("#calc-sum");
      if (sum) {
        sum.replaceChildren();
        exampleResult.rows.forEach((r, i) => {
          if (i) sum.append(node("span", "math-operator", " + "));
          const value = r.price * r.weight;
          const label = value > 0 && value < .0001 ? "$" + value.toExponential(2) : "$" + format(value, 4, 4);
          sum.append(node("span", "tone-" + i, label));
        });
      }
    }
    [...prices, ...usages].forEach((input) => input.addEventListener("input", updateExample));
    $("#reset-example").addEventListener("click", () => {
      defaults.forEach((r, i) => { prices[i].value = r.price.toFixed(2); usages[i].value = String(r.usage); });
      updateExample();
    });
    $("#export-example").addEventListener("click", () => {
      if (!exampleResult) return;
      const rows = [
        ["ILLUSTRATIVE CALCULATOR ONLY — FICTIONAL INPUTS — NOT MARKET DATA"],
        ["Common reference USD per 1M CCBT", exampleResult.reference],
        ["Model", "Price USD per 1M tokens", "Usage million tokens", "Usage weight", "CCBT per model token", "Weighted contribution USD per 1M CCBT"],
        ...exampleResult.rows.map((r) => [r.name, r.price, r.usage, r.weight, r.relative, r.price * r.weight])
      ];
      download("ccbt-illustrative-example.csv", csv(rows), "text/csv;charset=utf-8");
    });
    updateExample();
  }

  // Only validated, explicitly supplied observations can replace pre-publication state.
  function validateDataset(data) {
    if (!data || data.schema_version !== 1 || !Array.isArray(data.observations)) throw new Error("Invalid research dataset.");
    if (!data.market || !data.methodology || typeof data.market.name !== "string") throw new Error("Missing research metadata.");
    if (!data.observations.length) return [];
    for (const text of [data.market.id, data.market.name, data.market.scope, data.methodology.version, data.methodology.price_basis, data.methodology.pricing_convention]) {
      if (typeof text !== "string" || !text.trim() || /^(pre-publication|to be |not yet )/i.test(text)) throw new Error("Incomplete publication specification.");
    }
    let lastDate = "";
    let lastPublished = -Infinity;
    return data.observations.map((o) => {
      if (!o || !validIsoDate(o.observation_date)) throw new Error("Missing observation date.");
      if (o.observation_date <= lastDate) throw new Error("Observation dates must be unique and chronological.");
      lastDate = o.observation_date;
      const published = Date.parse(o.published_at);
      if (!Number.isFinite(published) || typeof o.published_at !== "string" || !o.published_at.includes("T") || !/(Z|[+-]\d{2}:\d{2})$/.test(o.published_at) || published > Date.now() || published < Date.parse(o.observation_date) || published < lastPublished) throw new Error("Invalid publication time.");
      lastPublished = published;
      if (!o.usage_window || !validIsoDate(o.usage_window.start) || !validIsoDate(o.usage_window.end) || o.usage_window.start > o.usage_window.end || o.usage_window.end > o.observation_date) throw new Error("Invalid usage window.");
      if (typeof o.coverage_note !== "string" || !o.coverage_note.trim()) throw new Error("Missing coverage disclosure.");
      if (!Array.isArray(o.sources) || !o.sources.some((s) => s.kind === "price") || !o.sources.some((s) => s.kind === "usage")) throw new Error("Price and usage sources are required.");
      if (o.sources.some((s) => !s.label || !safeUrl(s.url))) throw new Error("Invalid source URL.");
      if (!Array.isArray(o.constituents) || !o.constituents.length) throw new Error("Missing constituents.");
      const ids = new Set();
      const rows = o.constituents.map((r) => {
        if (typeof r.id !== "string" || !r.id || ids.has(r.id) || typeof r.name !== "string" || !r.name.trim()) throw new Error("Invalid constituent identity.");
        ids.add(r.id);
        if (!isFiniteNumber(r.price_usd_per_million) || r.price_usd_per_million < 0 || !isFiniteNumber(r.usage_tokens) || r.usage_tokens < 0 || r.usage_tokens > Number.MAX_SAFE_INTEGER) throw new Error("Invalid constituent inputs.");
        return { id: r.id, name: r.name, price: r.price_usd_per_million, usage: r.usage_tokens };
      });
      const result = calculate(rows);
      if (!result) throw new Error("The observation must define a positive reference.");
      return { raw: o, result };
    });
  }
  function appendMeta(dl, title, value) {
    const row = node("div"); row.append(node("dt", "", title), node("dd", "", value)); dl.append(row);
  }
  function renderPublishedPanel(panel, dataset, latest) {
    const { raw: observation, result } = latest;
    panel.replaceChildren();
    const top = node("div", "benchmark-panel-top");
    const left = node("div"); left.append(node("span", "micro-label", "Standard CCBT"), node("h3", "", "Research snapshot"));
    const badge = node("span", "badge", "Published observation");
    top.append(left, badge);
    const body = node("div", "benchmark-body");
    const summary = node("div", "benchmark-summary");
    summary.append(node("p", "micro-label", "Reference price"), node("div", "reference-value", money(result.reference)), node("p", "quote-unit", "USD / 1M CCBT"), node("p", "reference-status", "Research estimate · Not an executable quote"));
    const meta = node("dl", "compact-meta");
    appendMeta(meta, "Qualifying market", dataset.market.name);
    appendMeta(meta, "Observation", dateLabel(observation.observation_date));
    appendMeta(meta, "Usage window", dateLabel(observation.usage_window.start) + " – " + dateLabel(observation.usage_window.end));
    appendMeta(meta, "Qualifying models", String(result.rows.length));
    summary.append(meta);
    const chartArea = node("div", "published-chart");
    const title = node("div", "chart-title"); title.append(node("h4", "", "Model prices on a common basis"), node("span", "", "CCBT per model token"));
    const chart = node("div");
    // Homepage remains compact; the complete constituent table is on the research page.
    const chartRows = panel.dataset.benchmark === "compact" ? result.rows.slice(0, 8) : result.rows.slice(0, 20);
    relativeChart(chart, { ...result, rows: chartRows });
    chartArea.append(title, chart);
    if (chartRows.length !== result.rows.length) chartArea.append(node("p", "chart-note", `Showing ${chartRows.length} of ${result.rows.length} constituents. The complete table is on the research page.`));
    body.append(summary, chartArea);
    const foot = node("div", "benchmark-panel-foot");
    foot.append(node("span", "", `${dataset.methodology.price_basis} · Published ${dateLabel(observation.published_at, true)} · ${dataset.methodology.version}`));
    addLink(foot, "Sources and composition", "research.html#published-detail", "");
    panel.append(top, body, foot);
  }
  function dataTable(headers, rows, caption) {
    const wrap = node("div", "table-wrap");
    wrap.tabIndex = 0; wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", caption);
    const table = node("table", "comparison-table");
    table.append(node("caption", "", caption));
    const thead = node("thead"); const tr = node("tr");
    headers.forEach((text) => { const th = node("th", "", text); th.scope = "col"; tr.append(th); });
    thead.append(tr); table.append(thead);
    const tbody = node("tbody");
    rows.forEach((row) => {
      const tr = node("tr");
      row.forEach((text, i) => { const cell = node(i === 0 ? "th" : "td", "", text); if (i === 0) cell.scope = "row"; tr.append(cell); });
      tbody.append(tr);
    });
    table.append(tbody); wrap.append(table); return wrap;
  }
  function renderHistory(container, observations) {
    if (observations.length < 2) {
      container.append(node("p", "release-note", "One dated observation is available. A historical chart will appear after another observation is published."));
      return;
    }
    const section = node("section", "release-details");
    section.append(node("h3", "", "Published history"), node("p", "release-note", "Each point is a published research observation. Connecting lines do not represent intraperiod prices."));
    const wrap = node("div", "history-chart");
    const NS = "http://www.w3.org/2000/svg";
    const svgNode = (name, attrs, text) => {
      const n = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([key, value]) => n.setAttribute(key, value));
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const svg = svgNode("svg", { viewBox: "0 0 900 300", role: "img", "aria-label": "Published CCBT research prices in US dollars per million CCBT. Values are also available in the accompanying table." });
    const w = 784, h = 219, x0 = 75, y0 = 20;
    const dates = observations.map((o) => Date.parse(o.raw.observation_date));
    const max = Math.max(...observations.map((o) => o.result.reference)) * 1.15;
    const span = dates[dates.length - 1] - dates[0];
    const x = (d) => x0 + (d - dates[0]) / span * w;
    const y = (v) => y0 + h - v / max * h;
    [0, .5, 1].forEach((f) => {
      const yp = y(max * f);
      svg.append(svgNode("line", { x1: x0, x2: x0 + w, y1: yp, y2: yp, stroke: "#d4d7d4", "stroke-width": "1" }));
      svg.append(svgNode("text", { x: x0 - 12, y: yp + 4, "text-anchor": "end" }, money(max * f)));
    });
    svg.append(svgNode("polyline", { points: observations.map((o, i) => `${x(dates[i])},${y(o.result.reference)}`).join(" "), fill: "none", stroke: "#173f5f", "stroke-width": "2" }));
    observations.forEach((o, i) => {
      const circle = svgNode("circle", { cx: x(dates[i]), cy: y(o.result.reference), r: "4", fill: "#a74f2d" });
      circle.append(svgNode("title", {}, `${dateLabel(o.raw.observation_date)}: ${money(o.result.reference)} / 1M CCBT`));
      svg.append(circle);
    });
    svg.append(svgNode("text", { x: x0, y: 274, "text-anchor": "start" }, dateLabel(observations[0].raw.observation_date)));
    svg.append(svgNode("text", { x: x0 + w, y: 274, "text-anchor": "end" }, dateLabel(observations[observations.length - 1].raw.observation_date)));
    wrap.append(svg); section.append(wrap);
    const details = node("details", "disclosure");
    details.append(node("summary", "", "View dated observations"));
    details.append(dataTable(["Observation", "USD / 1M CCBT", "Publication time", "Usage window"], observations.map((o) => [dateLabel(o.raw.observation_date), money(o.result.reference), dateLabel(o.raw.published_at, true), o.raw.usage_window.start + " – " + o.raw.usage_window.end]), "Historical observations for this qualifying market and methodology."));
    section.append(details); container.append(section);
  }
  function renderPublishedDetails(container, dataset, observations) {
    const latest = observations[observations.length - 1];
    const { raw: o, result } = latest;
    container.hidden = false; container.replaceChildren(); container.classList.add("release-details");
    container.append(node("h3", "", "Composition and source record"));
    container.append(dataTable(["Qualifying model", "USD / 1M model tokens", "Qualifying tokens", "Usage weight", "CCBT per model token"], result.rows.map((r) => [r.name, money(r.price), format(r.usage, 0), format(r.weight * 100, 2) + "%", ratio(r.relative)]), "Constituents of the published research observation."));
    const grid = node("div", "release-grid");
    const notes = node("div");
    notes.append(node("h4", "", "Scope and calculation"));
    const spec = node("dl", "specification-list");
    appendMeta(spec, "Market", dataset.market.scope);
    appendMeta(spec, "Price basis", dataset.methodology.price_basis);
    appendMeta(spec, "Pricing convention", dataset.methodology.pricing_convention);
    appendMeta(spec, "Coverage", o.coverage_note);
    appendMeta(spec, "Methodology", dataset.methodology.version);
    notes.append(spec);
    const sources = node("div"); sources.append(node("h4", "", "Source record"));
    const list = node("ul", "source-list");
    o.sources.forEach((s) => {
      const li = node("li"); const a = node("a", "", s.label); a.href = safeUrl(s.url); a.rel = "noopener noreferrer";
      li.append(document.createTextNode(s.kind + ": "), a); list.append(li);
    });
    sources.append(list);
    if (o.notes) sources.append(node("p", "release-note", o.notes));
    sources.append(node("p", "release-note", "Research estimate. Not an executable offer or a guarantee of service availability."));
    const exportButton = node("button", "text-button", "Download this observation CSV ↓"); exportButton.type = "button";
    exportButton.addEventListener("click", () => {
      download("ccbt-research-" + o.observation_date + ".csv", csv([
        ["RESEARCH OBSERVATION — NOT AN EXECUTABLE QUOTE"], ["Market", dataset.market.name], ["Scope", dataset.market.scope],
        ["Observation date", o.observation_date], ["Published at", o.published_at], ["Usage window", o.usage_window.start, o.usage_window.end],
        ["Methodology", dataset.methodology.version], ["Price basis", dataset.methodology.price_basis], ["Pricing convention", dataset.methodology.pricing_convention],
        ["Coverage", o.coverage_note], ["USD per 1M CCBT", result.reference],
        ...o.sources.map((s) => ["Source " + s.kind, s.label, s.url]),
        ["Model ID", "Model", "USD per 1M model tokens", "Qualifying tokens", "Usage weight", "CCBT per model token"],
        ...result.rows.map((r) => [r.id, r.name, r.price, r.usage, r.weight, r.relative])
      ]), "text/csv;charset=utf-8");
    });
    sources.append(exportButton); grid.append(notes, sources); container.append(grid);
    renderHistory(container, observations);
  }
  function renderSpecification(container, dataset, latest) {
    container.replaceChildren();
    const notice = node("p", "notice");
    notice.textContent = "Published research specification. This is an implementation for the defined market below, not a representation of the entire AI market.";
    const dl = node("dl", "specification-list");
    appendMeta(dl, "Qualifying market", dataset.market.name);
    appendMeta(dl, "Scope", dataset.market.scope);
    appendMeta(dl, "Methodology version", dataset.methodology.version);
    appendMeta(dl, "Price basis", dataset.methodology.price_basis);
    appendMeta(dl, "Pricing convention", dataset.methodology.pricing_convention);
    appendMeta(dl, "Observation", latest.raw.observation_date);
    appendMeta(dl, "Usage window", latest.raw.usage_window.start + " – " + latest.raw.usage_window.end);
    appendMeta(dl, "Coverage", latest.raw.coverage_note);
    container.append(notice, dl);
    addLink(container, "Inspect constituents and sources", "research.html#published-detail");
  }
  try {
    if (window.SB_BENCHMARK) {
      const observations = validateDataset(window.SB_BENCHMARK);
      if (observations.length) {
        const researchStatus = $("[data-research-status]");
        if (researchStatus) researchStatus.textContent = "Published research observations · Dated market inputs · Not executable quotes";
        const latest = observations[observations.length - 1];
        $$('[data-benchmark]').forEach((panel) => renderPublishedPanel(panel, window.SB_BENCHMARK, latest));
        if ($("#published-detail")) renderPublishedDetails($("#published-detail"), window.SB_BENCHMARK, observations);
        if ($("#implementation-status")) renderSpecification($("#implementation-status"), window.SB_BENCHMARK, latest);
      }
    }
  } catch (error) {
    $$('[data-benchmark]').forEach((panel) => {
      const status = $(".reference-status", panel);
      const text = $(".pending-heading p", panel);
      if (status) status.textContent = "Research data unavailable";
      if (text) text.textContent = "The supplied research file did not pass validation. No reference price is being displayed. The illustrative calculator remains separate.";
      const badge = $(".badge", panel); if (badge) badge.textContent = "Publication unavailable";
    });
    const status = $("#implementation-status .notice");
    if (status) status.textContent = "The research file did not pass validation. No implementation is being represented as published.";
    // Failure is visible in the interface rather than silently rendering a misleading price.
  }

  // Inquiry configuration. Blank configuration is a local draft tool, never a fake submission.
  const config = window.SB_CONFIG || {};
  const founder = config.founder || {};
  if (typeof founder.name === "string" && founder.name.trim()) {
    const block = $("[data-founder]");
    if (block) {
      block.hidden = false;
      $("[data-founder-name]", block).textContent = founder.name;
      $("[data-founder-bio]", block).textContent = typeof founder.bio === "string" ? founder.bio : "";
      const profile = safeUrl(founder.profileUrl);
      if (profile) { const link = $("[data-founder-link]", block); link.href = profile; link.rel = "noopener noreferrer"; link.hidden = false; }
    }
  }
  const form = $("#inquiry-form");
  if (form) {
    const recipient = typeof config.contactEmail === "string" && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(config.contactEmail) ? config.contactEmail : "";
    let endpoint = "";
    try {
      if (typeof config.inquiryEndpoint === "string" && config.inquiryEndpoint) {
        const url = new URL(config.inquiryEndpoint, location.href);
        if (url.protocol === "https:" || (url.origin === location.origin && ["http:", "https:"].includes(url.protocol))) endpoint = url.href;
      }
    } catch (_) { /* Invalid destinations never receive an inquiry. */ }
    const mode = endpoint ? "endpoint" : recipient ? "email" : "draft";
    const submit = $("#inquiry-submit");
    submit.disabled = false;
    const modeNote = $("#form-mode-note");
    const privacy = $("#inquiry-privacy");
    const setSubmitText = (text) => { submit.replaceChildren(document.createTextNode(text), node("span", "", "→")); submit.lastChild.setAttribute("aria-hidden", "true"); };
    if (mode === "endpoint") {
      setSubmitText("Send inquiry");
      modeNote.textContent = "An initial discussion about participation—not an order, reservation, or commitment.";
      privacy.textContent = "Submitting sends the information above to the configured inquiry service. Share a high-level description only; no information is sent before you submit.";
    } else if (mode === "email") {
      setSubmitText("Open email draft");
      modeNote.textContent = "Prepare an inquiry for an initial discussion. Your email app will open a draft for you to review and send.";
      privacy.textContent = "This site does not submit the form to a server. Review and send the draft from your email app; you can also copy or save it below.";
    }
    if (recipient) {
      const direct = $("[data-direct-email]");
      direct.hidden = false; direct.href = "mailto:" + encodeURIComponent(recipient); direct.textContent = recipient;
    }
    const roleSelect = $("#inquiry-role");
    const roleDescriptions = {
      buyer: "A workload, approximate consumption, timing, or a procurement challenge.",
      provider: "Models and services, regions, available capacity, and the terms you could quote.",
      research: "The pricing, usage-data, methodology, or market-structure question you are working on.",
      other: "What you are working on and how it relates to Standard Basis."
    };
    function chooseRole(role) {
      if (!Object.prototype.hasOwnProperty.call(roleDescriptions, role)) return;
      roleSelect.value = role;
      $("#inquiry-message").placeholder = roleDescriptions[role];
    }
    chooseRole(new URLSearchParams(location.search).get("role") || "buyer");
    roleSelect.addEventListener("change", () => chooseRole(roleSelect.value));
    $$('[data-role]').forEach((link) => link.addEventListener("click", () => chooseRole(link.dataset.role)));
    let draft = "";
    let inFlight = false;
    function showDraft(payload) {
      const roles = { buyer: "Buyer", provider: "Provider", research: "Research collaborator", other: "Other participant" };
      draft = `Standard Basis inquiry — ${roles[payload.role] || "Participant"}\n\nName: ${payload.name}\nEmail: ${payload.email}\nOrganization: ${payload.company || "Not supplied"}\nParticipant type: ${roles[payload.role]}\n\n${payload.message}\n`;
      $("#inquiry-draft").value = draft;
      $("#inquiry-result").hidden = false;
      $("#inquiry-result-label").textContent = "Draft prepared · Not sent";
      $("#inquiry-feedback").textContent = "";
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (inFlight || !form.reportValidity()) return;
      if ($("#inquiry-website").value) return;
      const payload = {
        name: $("#inquiry-name").value.trim(), email: $("#inquiry-email").value.trim(),
        company: $("#inquiry-company").value.trim(), role: roleSelect.value,
        message: $("#inquiry-message").value.trim(), website: ""
      };
      const error = $("#inquiry-error"); error.hidden = true;
      if (!payload.name || !payload.message) { error.textContent = "Please add your name and a brief description."; error.hidden = false; return; }
      showDraft(payload);
      if (mode === "draft") {
        $("#inquiry-feedback").textContent = "This build has no receiving address. The draft has not been sent. Copy or save it for now.";
        $("#inquiry-result").focus({ preventScroll: true });
        $("#inquiry-result").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      } else if (mode === "email") {
        const subject = "Standard Basis inquiry — " + payload.role;
        $("#inquiry-feedback").textContent = "Opening your email app. Review and send there. If it does not open, copy the draft and email " + recipient + ".";
        window.location.href = "mailto:" + encodeURIComponent(recipient) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(draft);
      } else {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 15000);
        inFlight = true; submit.disabled = true; setSubmitText("Sending inquiry…");
        try {
          const response = await fetch(endpoint, {
            method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload), signal: controller.signal, credentials: "omit", redirect: "error"
          });
          if (!response.ok) throw new Error("The receiving service did not accept the inquiry.");
          const body = await response.json();
          if (body.ok !== true) throw new Error("The receiving service did not confirm receipt.");
          $("#inquiry-result-label").textContent = "Inquiry received";
          $("#inquiry-feedback").textContent = "The configured inquiry service confirmed receipt. A copy of your message is shown above.";
        } catch (failure) {
          error.textContent = "Receipt was not confirmed. Your draft is still available to copy or save. " + (failure.name === "AbortError" ? "The request timed out." : "Please check the connection or contact route before trying again.");
          error.hidden = false;
        } finally {
          window.clearTimeout(timer); inFlight = false; submit.disabled = false; setSubmitText("Send inquiry");
        }
      }
    });
    $("#copy-inquiry").addEventListener("click", async () => {
      const ok = await copyText(draft, $("#inquiry-draft"));
      $("#inquiry-feedback").textContent = ok ? "Inquiry copied. Copying does not send it." : "The draft is selected. Use your device’s Copy command.";
    });
    $("#save-inquiry").addEventListener("click", () => {
      download("standard-basis-inquiry.txt", draft);
      $("#inquiry-feedback").textContent = "Draft saved as a text file. Saving does not send it.";
    });
  }
})();
