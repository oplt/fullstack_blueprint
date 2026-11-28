import unittest

import pytest
from fastapi import HTTPException

from backend.core.config import settings
from backend.modules.platform import settings_configuration as config_service
from backend.modules.platform.settings_schemas import ConfigEntryUpdate


def test_config_editor_rejects_unknown_keys_without_writing(monkeypatch, tmp_path):
    config_file = tmp_path / ".env"
    monkeypatch.setattr(config_service, "ENV_FILE", config_file)
    monkeypatch.setattr(settings, "APP_ENV", "dev")

    with pytest.raises(HTTPException) as error:
        config_service.SettingsConfigService._update_config_entries_sync(
            [ConfigEntryUpdate(key="INJECTED_VALUE", value="x")]
        )

    unittest.TestCase().assertEqual(error.value.status_code, 422)
    unittest.TestCase().assertFalse(config_file.exists())


def test_config_editor_escapes_values_and_requires_restart(monkeypatch, tmp_path):
    config_file = tmp_path / ".env"
    monkeypatch.setattr(config_service, "ENV_FILE", config_file)
    monkeypatch.setattr(settings, "APP_ENV", "dev")
    original_name = settings.APP_NAME

    response = config_service.SettingsConfigService._update_config_entries_sync(
        [ConfigEntryUpdate(key="APP_NAME", value='quoted "value"')]
    )

    testcase = unittest.TestCase()
    testcase.assertIn('APP_NAME="quoted \\"value\\""', config_file.read_text())
    testcase.assertEqual(original_name, settings.APP_NAME)
    testcase.assertTrue(response.notice.endswith("for changes to take effect."))
    testcase.assertTrue(
        next(item for item in response.items if item.key == "APP_NAME").requires_restart
    )
    testcase.assertEqual(config_file.stat().st_mode & 0o777, 0o600)


def test_config_editor_is_disabled_in_production(monkeypatch, tmp_path):
    config_file = tmp_path / ".env"
    monkeypatch.setattr(config_service, "ENV_FILE", config_file)
    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(HTTPException) as error:
        config_service.SettingsConfigService._update_config_entries_sync(
            [ConfigEntryUpdate(key="APP_NAME", value="Changed")]
        )

    unittest.TestCase().assertEqual(error.value.status_code, 403)
    unittest.TestCase().assertFalse(config_file.exists())


def test_config_validation_error_does_not_echo_submitted_value(monkeypatch, tmp_path):
    config_file = tmp_path / ".env"
    monkeypatch.setattr(config_service, "ENV_FILE", config_file)
    monkeypatch.setattr(settings, "APP_ENV", "dev")
    submitted_value = "invalid-port-value"

    with pytest.raises(HTTPException) as error:
        config_service.SettingsConfigService._update_config_entries_sync(
            [ConfigEntryUpdate(key="APP_PORT", value=submitted_value)]
        )

    testcase = unittest.TestCase()
    testcase.assertEqual(error.value.status_code, 422)
    testcase.assertNotIn(submitted_value, str(error.value.detail))
    testcase.assertFalse(config_file.exists())
