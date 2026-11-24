"""Run against a separately started, migrated development test instance."""

import os
from uuid import uuid4

import httpx
import pytest

API_URL = os.getenv("BLUEPRINT_TEST_API_URL")
pytestmark = pytest.mark.skipif(not API_URL, reason="Set BLUEPRINT_TEST_API_URL for live tests")


def sign_in_new_account(client: httpx.Client) -> str:
    credentials = {"email": f"project-{uuid4()}@example.com", "password": "Blueprint-test-123!"}
    assert client.post("/auth/sign-up", json=credentials).status_code == 202
    response = client.post("/auth/sign-in", json=credentials)
    assert response.status_code == 200
    client.headers["X-CSRF-Token"] = client.cookies[
        os.getenv("BLUEPRINT_TEST_CSRF_COOKIE", "blueprint_csrf")
    ]
    return response.json()["user"]["id"]


def test_project_task_crud_and_membership():
    with httpx.Client(base_url=API_URL) as owner, httpx.Client(base_url=API_URL) as viewer:
        sign_in_new_account(owner)
        viewer_id = sign_in_new_account(viewer)
        response = owner.post("/projects", json={"name": "Project integration test"})
        assert response.status_code == 201
        project = f"/projects/{response.json()['id']}"
        assert viewer.get(project).status_code == 404
        assert viewer.get("/admin/users").status_code == 403
        assert (
            owner.put(
                f"{project}/members/{viewer_id}", json={"user_id": viewer_id, "role": "viewer"}
            ).status_code
            == 200
        )
        assert viewer.get(project).status_code == 200
        assert viewer.post(f"{project}/tasks", json={"title": "Restricted task"}).status_code == 403

        response = owner.post(f"{project}/tasks", json={"title": "First task"})
        assert response.status_code == 201
        task = f"{project}/tasks/{response.json()['id']}"
        assert owner.patch(task, json={"title": "Updated task"}).status_code == 200
        page = viewer.get(f"{project}/tasks", params={"limit": 1, "offset": 0}).json()
        assert page["total"] == 1
        assert page["items"][0]["title"] == "Updated task"
        assert owner.delete(task, headers={"X-CSRF-Token": ""}).status_code == 403
        assert owner.delete(task).status_code == 204
        assert viewer.get(f"{project}/tasks").json()["total"] == 0
