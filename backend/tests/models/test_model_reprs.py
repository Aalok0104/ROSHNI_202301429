from uuid import uuid4

from app.models.disaster_management import Incident, Disaster
from app.models.news_models import NewsState, NewsCity, Newspaper, NewsAnalysisLog
from app.models.questionnaires_and_logs import (
    DisasterFollower,
    QuestionTemplate,
    DisasterChatMessage,
)
from app.models.user_family_models import UserProfile, UserMedicalProfile


def test_news_model_reprs():
    state = NewsState(id=1, name="State")
    city = NewsCity(id=2, name="City", state_id=1)
    paper = Newspaper(id=3, name="Paper", rss_url="http://x", city_id=2, is_national=False)
    log = NewsAnalysisLog(
        id=4,
        commander_user_id=uuid4(),
        city_name="City",
        state_name="State",
        keyword=None,
        result_json={},
    )
    # Exercise reprs to cover remaining branches
    assert "State" in repr(state)
    assert "City" in repr(city)
    assert "Paper" in repr(paper)
    assert paper.rss_feed_url == paper.rss_url
    assert "NewsAnalysisLog" in repr(log)


def test_other_model_reprs():
    incident = Incident(incident_id=uuid4(), title="Inc")
    disaster = Disaster(disaster_id=uuid4(), title="Dis")
    follower = DisasterFollower(disaster_id=uuid4(), user_id=uuid4())
    tmpl = QuestionTemplate(question_id=uuid4(), key="k", question_text="q", answer_type="text")
    chat = DisasterChatMessage(message_id=uuid4(), disaster_id=uuid4())
    profile = UserProfile(user_id=uuid4(), full_name="Test User")
    medical = UserMedicalProfile(user_id=uuid4(), public_user_code="abc123")

    assert "Incident" in repr(incident)
    assert "Disaster" in repr(disaster)
    assert "DisasterFollower" in repr(follower)
    assert "QuestionTemplate" in repr(tmpl)
    assert "DisasterChatMessage" in repr(chat)
    assert "UserProfile" in repr(profile)
    assert "UserMedicalProfile" in repr(medical)
