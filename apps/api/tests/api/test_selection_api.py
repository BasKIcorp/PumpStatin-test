import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "algorithm" in data


@pytest.mark.asyncio
async def test_login_and_match(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"username": "strela", "password": "demo123"},
    )
    assert login.status_code == 200
    token = login.json()["accessToken"]

    match = await client.post(
        "/api/v1/selection/match-pumps",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_line": "bps-w",
            "flow_id": "bps-w-domestic",
            "parameters": {
                "flowRate": 15,
                "head": 20,
                "workingPumps": 2,
                "reservePumps": 1,
                "pumpType": "COMOS",
                "puLine": "bps-w-pro",
            },
        },
    )
    assert match.status_code == 200
    pumps = match.json()["pumps"]
    assert len(pumps) >= 1


@pytest.mark.asyncio
async def test_algorithm_rules(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"username": "strela", "password": "demo123"},
    )
    token = login.json()["accessToken"]
    r = await client.get(
        "/api/v1/config/algorithm-rules",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert "rules" in r.json()


@pytest.mark.asyncio
async def test_block_registry(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"username": "strela", "password": "demo123"},
    )
    token = login.json()["accessToken"]
    r = await client.get(
        "/api/v1/config/block-registry",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["profileId"] == "default"
    assert isinstance(data.get("blocks"), list)
