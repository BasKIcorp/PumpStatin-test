from app.tools.validate_profile_config import validate_profiles


def test_validate_profiles():
    assert validate_profiles() == 0
