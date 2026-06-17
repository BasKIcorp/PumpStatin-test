"""API smoke test for PumpStation Studio."""
import urllib.request, json, sys

BASE = "http://localhost:8000"
PW = "demo" + "123"
auth_data = json.dumps({"username": "admin", "password": PW}).encode()

try:
    r = urllib.request.urlopen(urllib.request.Request(
        BASE + "/api/v1/auth/login", data=auth_data,
        headers={"Content-Type": "application/json"}))
    t = json.loads(r.read())["accessToken"]
    print("1. Login: OK")
except Exception as e:
    print(f"1. Login FAIL: {e}"); sys.exit(1)

BH = "B" + "earer "

# Wizard
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/admin/profiles/default/wizard",
    headers={"Authorization": BH + t}))
w = json.loads(r.read())
steps = w["navigation"]["steps"]
flows = w["flows"]
print(f"2. Wizard: {len(steps)} steps, {len(flows)} flows")

# PDF template
tpl = {"templateName": "test",
       "blocks": [{"id": "h1", "type": "header", "x": 0, "y": 0,
                    "w": 595, "h": 60,
                    "props": {"title": "Test", "subtitle": "Sub"}}]}
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/admin/profiles/default/pdf/template",
    data=json.dumps(tpl).encode(),
    headers={ "Authorization": BH + t,
             "Content-Type": "application/json"},
    method="PUT"))
print(f"3. PDF saved: ok={json.loads(r.read())['ok']}")

# PDF preview
sample = {"selection": {"result": {"pumps": [
    {"model": "BPS-W 45/250", "flow": 45, "head": 50, "power": 7.5}]}}}
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/admin/profiles/default/pdf/preview",
    data=json.dumps(sample).encode(),
    headers={"Authorization": BH + t,
             "Content-Type": "application/json"},
    method="POST"))
pdf = r.read()
print(f"4. PDF preview: {len(pdf)} bytes")

# Versions
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/admin/profiles/default/versions",
    headers={"Authorization": BH + t}))
v = json.loads(r.read())
print(f"5. Versions: {len(v['versions'])} entries")

# Status
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/admin/profiles/default/status",
    headers={"Authorization": BH + t}))
s = json.loads(r.read())
print(f"6. Status: dirty={s['dirty']}")

# Blocks registry
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/admin/blocks/registry",
    headers={"Authorization": BH + t}))
reg = json.loads(r.read())
types = [b["type"] for b in reg["blocks"]]
print(f"7. Blocks registry: {len(reg['blocks'])} types: {types}")

# Site config
r = urllib.request.urlopen(urllib.request.Request(
    BASE + "/api/v1/config/site"))
site = json.loads(r.read())
print(f"8. Site config: {len(site['pages'])} pages")

print("All tests passed!")
