def test_main_app_initializes():
    from app.main import app

    assert app.title == "ROSHNI API Backend"
