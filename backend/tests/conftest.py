import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.main import app
from backend.app.db.session import Base, get_db

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def user_a_headers(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "password": "SecurePassword123!", "full_name": "Alice Engineer"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def user_b_headers(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "password": "SecurePassword123!", "full_name": "Bob Reviewer"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
