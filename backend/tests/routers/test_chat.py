import pytest
import asyncio
from uuid import uuid4
from datetime import datetime

from app.services.websocket_manager import ConnectionManager
from app.models.questionnaires_and_logs import DisasterChatMessage
from app.models.responder_management import Team, ResponderProfile
from app.models.disaster_management import DisasterTask, DisasterTaskAssignment
from app.models.user_family_models import Role, User, UserProfile
from geoalchemy2.shape import from_shape
from shapely.geometry import Point


@pytest.mark.asyncio
async def test_connection_manager_room_keys():
    manager = ConnectionManager()
    disaster_id = uuid4()

    class MockWS:
        def __init__(self):
            self.accepted = False
            self.sent_messages = []

        async def accept(self):
            self.accepted = True

        async def send_text(self, text):
            self.sent_messages.append(text)

    ws1 = MockWS()
    ws2 = MockWS()

    room_key = f"room:{disaster_id}"

    # Connect
    await manager.connect(ws1, room_key)
    assert ws1.accepted
    assert room_key in manager.active_connections
    assert len(manager.active_connections[room_key]) == 1

    # Connect second
    await manager.connect(ws2, room_key)
    assert len(manager.active_connections[room_key]) == 2

    # Broadcast
    msg = {"text": "hello"}
    await manager.broadcast(msg, room_key)
    assert len(ws1.sent_messages) == 1
    assert len(ws2.sent_messages) == 1
    assert "hello" in ws1.sent_messages[0]

    # Disconnect
    manager.disconnect(ws1, room_key)
    assert len(manager.active_connections[room_key]) == 1

    manager.disconnect(ws2, room_key)
    assert room_key not in manager.active_connections


@pytest.mark.asyncio
async def test_history_team_and_global(async_client, async_db_session, async_create_user, async_create_disaster):
    # Create users
    responder = await async_create_user(email="responder@example.com", role_name="responder")
    commander = await async_create_user(email="commander@example.com", role_name="commander")

    # Create disaster
    disaster = await async_create_disaster()

    # Create team and responder profile
    team = Team(team_id=uuid4(), name="Alpha", team_type="disaster_response", commander_user_id=commander.user_id)
    async_db_session.add(team)
    await async_db_session.commit()

    profile = ResponderProfile(user_id=responder.user_id, team_id=team.team_id, responder_type="logistician")
    async_db_session.add(profile)
    await async_db_session.commit()

    # Create a disaster task and assign the team
    task = DisasterTask(task_id=uuid4(), disaster_id=disaster.disaster_id, created_by_commander_id=commander.user_id, task_type="search")
    async_db_session.add(task)
    await async_db_session.commit()

    assignment = DisasterTaskAssignment(task_id=task.task_id, team_id=team.team_id, assigned_by_user_id=commander.user_id)
    async_db_session.add(assignment)
    await async_db_session.commit()

    # Insert a team-scoped message and a global message
    team_msg = DisasterChatMessage(disaster_id=disaster.disaster_id, team_id=team.team_id, sender_user_id=responder.user_id, message_text="Team message", is_global=False)
    global_msg = DisasterChatMessage(disaster_id=disaster.disaster_id, sender_user_id=commander.user_id, message_text="Global message", is_global=True)
    async_db_session.add_all([team_msg, global_msg])
    await async_db_session.commit()

    # Fetch team history
    resp_team = await async_client.get(f"/chat/{disaster.disaster_id}/history?scope=team&team_id={team.team_id}")
    assert resp_team.status_code == 200
    data_team = resp_team.json()
    # team history should include only the team message
    texts = [m["message_text"] for m in data_team]
    assert "Team message" in texts
    assert "Global message" not in texts

    # Fetch global history
    resp_global = await async_client.get(f"/chat/{disaster.disaster_id}/history?scope=global")
    assert resp_global.status_code == 200
    data_global = resp_global.json()
    texts_global = [m["message_text"] for m in data_global]
    assert "Global message" in texts_global
    assert "Team message" not in texts_global
