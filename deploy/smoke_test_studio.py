import urllib.request, json

BASE = "http://localhost:8001"

# Login
req = urllib.request.Request(
    f"{BASE}/api/v1/auth/login",
    data=json.dumps({"username": "admin", "password": "demo123"}).encode(),
    headers={"Content-Type": "application/json"},
)
resp = json.loads(urllib.request.urlopen(req).read())
token = resp["accessToken"]
print("1. Login: OK")

# Test blocks registry
req = urllib.request.Request(
    f"{BASE}/api/v1/admin/blocks/registry",
    headers={"Authorization": f"Bearer {token}"},
)
data = json.loads(urllib.request.urlopen(req).read())
print(f"2. Blocks registry: {data}")

# Test profile preview
req = urllib.request.Request(
    f"{BASE}/api/v1/admin/profiles/default/preview",
    headers={"Authorization": f"Bearer {token}"},
)
data = json.loads(urllib.request.urlopen(req).read())
has_site = "site" in data
has_branding = "branding" in data
has_wizard = "wizard" in data
print(f"3. Preview - site: {has_site}, branding: {has_branding}, wizard: {has_wizard}")

# Test PUT site
site = data["site"]
req = urllib.request.Request(
    f"{BASE}/api/v1/admin/profiles/default/site",
    data=json.dumps({"layout": site["layout"], "pages": site["pages"]}).encode(),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    method="PUT",
)
resp = json.loads(urllib.request.urlopen(req).read())
print(f"4. PUT site: OK, pages={len(resp['pages'])}")

# Test config/site (no auth required)
req = urllib.request.Request(f"{BASE}/api/v1/config/site")
data = json.loads(urllib.request.urlopen(req).read())
print(f"5. GET /config/site: OK, pages={len(data['pages'])}")

# Test auth/session (no auth required - guest mode)
req = urllib.request.Request(f"{BASE}/api/v1/auth/session")
data = json.loads(urllib.request.urlopen(req).read())
print(f"6. GET /auth/session has site: {'site' in data}")

print("\nAll tests passed!")
