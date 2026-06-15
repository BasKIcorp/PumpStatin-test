import urllib.request, json

BASE = "http://localhost:8000"

# Login
req = urllib.request.Request(f"{BASE}/api/v1/auth/login",
    data=json.dumps({"username": "admin", "password": "demo123"}).encode(),
    headers={"Content-Type": "application/json"})
token = json.loads(urllib.request.urlopen(req).read())["accessToken"]
print(f"Login OK, token: {token[:20]}...")

# Test wizard GET
url = f"{BASE}/api/v1/admin/profiles/default/wizard"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    nav = data.get("navigation", {})
    steps = nav.get("steps", [])
    flows = data.get("flows", {})
    print(f"GET wizard: OK")
    print(f"  Steps: {len(steps)}")
    for s in steps:
        print(f"    - {s.get('id')} ({s.get('type')})")
    print(f"  Flows: {list(flows.keys())}")
except urllib.error.HTTPError as e:
    print(f"GET wizard FAIL: {e.code} {e.reason}")
    print(e.read().decode()[:300])
