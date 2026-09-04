import pytest
import app as app_module


@pytest.fixture(autouse=True)
def isolate_profile_storage(tmp_path, monkeypatch):
    """Existing authentication tests must never create real profile files."""
    monkeypatch.setattr(app_module, 'PROFILES_ROOT', tmp_path / 'profiles')
