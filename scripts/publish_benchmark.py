#!/usr/bin/env python3
"""Validate benchmark.json and publish its browser-readable companion atomically.

Standard library only. This script does not fetch prices or invent usage weights.
The canonical JSON contains raw observations; prices, weights, and history are
calculated from those inputs by the website. All observations in one file must
use the same qualifying-market definition and methodology.

Usage:
    python3 scripts/publish_benchmark.py
    python3 scripts/publish_benchmark.py --check
    python3 scripts/publish_benchmark.py path/to/input.json --output path/to/output.js
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


def require_text(value: Any, label: str, *, publication: bool = False) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text.")
    if publication and value.lower().startswith(("pre-publication", "to be ", "not yet ")):
        raise ValueError(f"{label} still contains a pre-publication placeholder.")
    return value


def require_number(value: Any, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a JSON number, not a string or boolean.")
    try:
        number = float(value)
    except (OverflowError, ValueError) as exc:
        raise ValueError(f"{label} must be finite.") from exc
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{label} must be finite and non-negative.")
    return number


def require_date(value: Any, label: str) -> date:
    if not isinstance(value, str) or len(value) != 10:
        raise ValueError(f"{label} must use YYYY-MM-DD.")
    try:
        result = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} must be a real ISO date.") from exc
    if result.isoformat() != value:
        raise ValueError(f"{label} must use YYYY-MM-DD.")
    return result


def require_timestamp(value: Any, label: str) -> datetime:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a timestamp with a timezone.")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label} must be an ISO timestamp with a timezone.") from exc
    if result.tzinfo is None or "T" not in value:
        raise ValueError(f"{label} must include a time and timezone, for example ...T16:00:00Z.")
    return result.astimezone(timezone.utc)


def validate(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, dict) or data.get("schema_version") != 1:
        raise ValueError("A JSON object with schema_version 1 is required.")
    market = data.get("market")
    method = data.get("methodology")
    observations = data.get("observations")
    if not isinstance(market, dict) or not isinstance(method, dict):
        raise ValueError("market and methodology objects are required.")
    if not isinstance(observations, list):
        raise ValueError("observations must be an array (empty before first publication).")
    publishing = len(observations) > 0
    for field in ("id", "name", "scope"):
        require_text(market.get(field), f"market.{field}", publication=publishing)
    for field in ("version", "price_basis", "pricing_convention"):
        require_text(method.get(field), f"methodology.{field}", publication=publishing)
    # Only a safe relative path or a fully qualified public web URL can be supplied.
    href = require_text(method.get("href"), "methodology.href")
    parsed = urlparse(href)
    if parsed.scheme and parsed.scheme not in ("https", "http"):
        raise ValueError("methodology.href is not a safe link.")
    if href.startswith("//") or "\\" in href:
        raise ValueError("methodology.href is not a safe link.")

    summaries: list[dict[str, Any]] = []
    last_observation: date | None = None
    last_publication: datetime | None = None
    now = datetime.now(timezone.utc)
    for index, observation in enumerate(observations):
        prefix = f"observations[{index}]"
        if not isinstance(observation, dict):
            raise ValueError(f"{prefix} must be an object.")
        day = require_date(observation.get("observation_date"), f"{prefix}.observation_date")
        published = require_timestamp(observation.get("published_at"), f"{prefix}.published_at")
        if day > now.date() or published > now:
            raise ValueError(f"{prefix}: future-dated observations/publications are not allowed.")
        if published.date() < day:
            raise ValueError(f"{prefix}: publication precedes the observation date.")
        if last_observation is not None and day <= last_observation:
            raise ValueError("Observation dates must be unique and strictly chronological.")
        if last_publication is not None and published < last_publication:
            raise ValueError("Publication timestamps must be chronological.")
        last_observation, last_publication = day, published
        window = observation.get("usage_window")
        if not isinstance(window, dict):
            raise ValueError(f"{prefix}.usage_window must have start and end dates.")
        start = require_date(window.get("start"), f"{prefix}.usage_window.start")
        end = require_date(window.get("end"), f"{prefix}.usage_window.end")
        if start > end or end > day:
            raise ValueError(f"{prefix}: usage window must end on/before the observation date.")
        require_text(observation.get("coverage_note"), f"{prefix}.coverage_note", publication=True)
        if "notes" in observation and not isinstance(observation["notes"], str):
            raise ValueError(f"{prefix}.notes must be plain text.")

        sources = observation.get("sources")
        if not isinstance(sources, list) or not sources:
            raise ValueError(f"{prefix}: price and usage source records are required.")
        kinds: set[str] = set()
        for source in sources:
            if not isinstance(source, dict):
                raise ValueError(f"{prefix}: each source must be an object.")
            require_text(source.get("label"), f"{prefix}.sources.label")
            kind = require_text(source.get("kind"), f"{prefix}.sources.kind")
            if kind not in ("price", "usage", "methodology", "other"):
                raise ValueError(f"{prefix}: source kind must be price, usage, methodology, or other.")
            kinds.add(kind)
            url = require_text(source.get("url"), f"{prefix}.sources.url")
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password:
                raise ValueError(f"{prefix}: source URLs must be public HTTP(S) links without credentials.")
        if not {"price", "usage"}.issubset(kinds):
            raise ValueError(f"{prefix}: both price and usage sources must be documented.")

        constituents = observation.get("constituents")
        if not isinstance(constituents, list) or not constituents:
            raise ValueError(f"{prefix}: at least one constituent is required.")
        seen: set[str] = set()
        quantities: list[float] = []
        weighted_prices: list[float] = []
        prices: list[float] = []
        for row in constituents:
            if not isinstance(row, dict):
                raise ValueError(f"{prefix}: each constituent must be an object.")
            identity = require_text(row.get("id"), f"{prefix}.constituents.id")
            require_text(row.get("name"), f"{prefix}.constituents.name")
            if identity in seen:
                raise ValueError(f"{prefix}: duplicate constituent ID {identity!r}.")
            seen.add(identity)
            price = require_number(row.get("price_usd_per_million"), f"{prefix}/{identity}.price_usd_per_million")
            usage = require_number(row.get("usage_tokens"), f"{prefix}/{identity}.usage_tokens")
            if usage > 9_007_199_254_740_991:
                raise ValueError(f"{prefix}/{identity}: usage exceeds JavaScript's safe integer range.")
            quantities.append(usage)
            prices.append(price)
            weighted_prices.append(price * usage)
        try:
            total = math.fsum(quantities)
            weighted = math.fsum(weighted_prices)
        except (OverflowError, ValueError) as exc:
            raise ValueError(f"{prefix}: calculation exceeds finite numeric bounds.") from exc
        if not math.isfinite(total) or not math.isfinite(weighted) or total <= 0 or weighted <= 0:
            raise ValueError(f"{prefix}: usage and the resulting reference must be positive and finite.")
        reference = weighted / total
        if not math.isfinite(reference) or reference <= 0 or any(not math.isfinite(p / reference) for p in prices):
            raise ValueError(f"{prefix}: relative conversions must be positive/finite where applicable.")
        summaries.append({"date": day.isoformat(), "price_usd_per_million_ccbt": reference,
                          "qualifying_models": len(constituents), "usage_tokens": total})
    return summaries


def reject_constant(value: str) -> None:
    raise ValueError(f"Non-standard JSON numeric constant: {value}")


def publish(source: Path, output: Path, *, check: bool = False) -> list[dict[str, Any]]:
    data = json.loads(source.read_text(encoding="utf-8"), parse_constant=reject_constant)
    summaries = validate(data)
    if not check:
        # escape '<' as well so this generated file may safely be inlined in a preview.
        encoded = json.dumps(data, ensure_ascii=True, indent=2, allow_nan=False).replace("<", "\\u003c")
        script = "// Generated from benchmark.json. Do not edit this file directly.\nwindow.SB_BENCHMARK = " + encoded + ";\n"
        output.parent.mkdir(parents=True, exist_ok=True)
        temp: str | None = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent,
                                             prefix=".benchmark-", suffix=".tmp", delete=False) as f:
                temp = f.name
                f.write(script)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp, output)
        finally:
            if temp and os.path.exists(temp):
                os.unlink(temp)
    return summaries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=ROOT / "data/benchmark.json")
    parser.add_argument("--output", type=Path, default=ROOT / "data/benchmark.js")
    parser.add_argument("--check", action="store_true", help="Validate without overwriting any output.")
    args = parser.parse_args()
    try:
        summaries = publish(args.source, args.output, check=args.check)
    except (ValueError, OSError, TypeError, KeyError) as exc:
        print(f"Not published: {exc}\nThe existing browser data file was left unchanged.", file=sys.stderr)
        return 1
    print("Validation passed." if args.check else f"Published browser data to {args.output}")
    if summaries:
        latest = summaries[-1]
        print(f"{len(summaries)} observation(s); latest {latest['date']}: "
              f"${latest['price_usd_per_million_ccbt']:.6f} / 1M CCBT, "
              f"{latest['qualifying_models']} model(s).")
    else:
        print("Pre-publication state retained. No market observations or prices.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
