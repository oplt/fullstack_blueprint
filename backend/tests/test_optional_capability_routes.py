from unittest import TestCase
from unittest.mock import patch

from backend.router import build_api_router
from backend.core.config import settings


def _paths(config) -> set[str]:
    router = build_api_router(config)
    return {route.path for route in router.routes}


class OptionalCapabilityRouteTests(TestCase):
    def test_minimal_router_keeps_identity_and_omits_optional_capabilities(self) -> None:
        config = settings.model_copy(
            update={
                "AI_ENABLED": False,
                "AI_MCP_ENABLED": False,
                "MEMORY_ENABLED": False,
                "RAG_ENABLED": False,
                "CALENDAR_ENABLED": False,
                "PROJECTS_ENABLED": False,
                "ORGANIZATIONS_ENABLED": False,
                "PLATFORM_API_ENABLED": False,
                "NOTIFICATIONS_ENABLED": False,
                "OBSERVABILITY_ENABLED": False,
                "SETTINGS_API_ENABLED": False,
                "ADMIN_API_ENABLED": False,
            }
        )

        with patch("backend.router.import_module", side_effect=AssertionError):
            paths = _paths(config)

        self.assertIn("/api/v1/platform/metadata", paths)
        paths.remove("/api/v1/platform/metadata")
        self.assertTrue(any(path.startswith("/api/v1/auth") for path in paths))
        self.assertTrue(any(path.startswith("/api/v1/users") for path in paths))
        self.assertTrue(any(path.startswith("/api/v1/profile") for path in paths))
        self.assertFalse(
            any(
                path.startswith(
                    (
                        "/api/v1/ai",
                        "/api/v1/agent",
                        "/api/v1/memory",
                        "/api/v1/rag",
                        "/api/v1/calendar",
                        "/api/v1/projects",
                        "/api/v1/organizations",
                        "/api/v1/platform",
                        "/api/v1/notifications",
                        "/api/v1/observability",
                        "/api/v1/settings",
                        "/api/v1/admin",
                    )
                )
                for path in paths
            )
        )

    def test_metadata_is_registered_exactly_once(self) -> None:
        for enabled in (False, True):
            with self.subTest(platform_enabled=enabled):
                config = settings.model_copy(update={"PLATFORM_API_ENABLED": enabled})
                router = build_api_router(config)
                metadata_routes = [
                    route for route in router.routes if route.path == "/api/v1/platform/metadata"
                ]
                self.assertEqual(len(metadata_routes), 1)

    def test_agents_require_ai_and_agent_flag_independently(self) -> None:
        config = settings.model_copy(update={"AI_ENABLED": True, "AI_MCP_ENABLED": False})
        paths = _paths(config)

        self.assertTrue(any(path.startswith("/api/v1/ai") for path in paths))
        self.assertFalse(any(path.startswith("/api/v1/agent") for path in paths))

        config = settings.model_copy(update={"AI_ENABLED": False, "AI_MCP_ENABLED": True})
        self.assertFalse(any(path.startswith("/api/v1/agent") for path in _paths(config)))
