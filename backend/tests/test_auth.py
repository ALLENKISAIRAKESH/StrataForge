def test_register_success(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": "Password123!", "full_name": "New User"},
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["full_name"] == "New User"


def test_register_duplicate_email(client):
    payload = {"email": "duplicate@example.com", "password": "Password123!", "full_name": "User 1"}
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_login_success(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "loginuser@example.com", "password": "CorrectPassword!", "full_name": "Login User"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser@example.com", "password": "CorrectPassword!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "loginuser@example.com"


def test_login_invalid_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "wrongpwd@example.com", "password": "CorrectPassword!"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpwd@example.com", "password": "WrongPassword!"},
    )
    assert res.status_code == 401


def test_auth_me(client, user_a_headers):
    res = client.get("/api/v1/auth/me", headers=user_a_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "alice@example.com"


def test_auth_me_unauthorized(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
