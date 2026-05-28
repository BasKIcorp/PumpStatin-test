#!/usr/bin/env python3
"""Полный smoke-тест API на сервере."""

import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def req(method: str, path: str, data: dict | None = None, token: str | None = None):
    headers: dict[str, str] = {}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data is not None else None
    request = urllib.request.Request(
        f"{BASE}{path}", data=body, headers=headers, method=method
    )
    with urllib.request.urlopen(request) as resp:
        raw = resp.read()
        return json.loads(raw.decode()) if raw else {}


def main() -> None:
    health = req("GET", "/health")
    assert health["status"] == "ok", health
    print("OK health", health)

    login = req("POST", "/api/v1/auth/login", {"username": "strela", "password": "demo123"})
    token = login["accessToken"]
    print("OK login profile", login["profile"]["id"])

    session = req("GET", "/api/v1/auth/session", token=token)
    assert session["authenticated"]
    print("OK session", session["profile"]["theme"])

    catalog = req("GET", "/api/v1/catalog/catalog.pumpTypes", token=token)
    assert len(catalog["items"]) >= 1
    print("OK catalog", len(catalog["items"]), "items")

    match = req(
        "POST",
        "/api/v1/selection/match-pumps",
        {
            "product_line": "bps-w",
            "flow_id": "bps-w-domestic",
            "parameters": {"flowRate": 15, "head": 20, "workingPumps": 1, "reservePumps": 1},
        },
        token=token,
    )
    assert match["pumps"], match
    pump_id = match["pumps"][0]["id"]
    print("OK match", pump_id, match["pumps"][0]["name"])

    build = req(
        "POST",
        "/api/v1/selection/build-station",
        {
            "product_line": "bps-w",
            "flow_id": "bps-w-domestic",
            "parameters": {"flowRate": 15, "head": 20, "pn": "16"},
            "selected_pump_id": pump_id,
        },
        token=token,
    )
    sid = build["selectionId"]
    print("OK build", sid)

    pdf_req = urllib.request.Request(
        f"{BASE}/api/v1/selection/generate-pdf",
        data=json.dumps({"selection_id": sid}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(pdf_req) as resp:
        pdf = resp.read()
    assert pdf[:4] == b"%PDF", pdf[:20]
    print("OK pdf", len(pdf), "bytes")

    print("\nAll smoke tests passed.")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as e:
        print("FAIL", e.code, e.read().decode())
        raise
