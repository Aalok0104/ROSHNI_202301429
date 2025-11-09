import pytest

from app import models


def test_user_profile_created_and_deleted_with_user(db_session):
    role = models.Role(name="user", description="Default user role")
    user = models.User(email="test@example.com", hashed_password="secret")
    profile = models.UserProfile(user=user, full_name="Test User")
    mapping = models.UserRole(user=user, role=role)

    db_session.add_all([role, user, profile, mapping])
    db_session.commit()

    stored_user = db_session.query(models.User).filter_by(email="test@example.com").one()
    assert stored_user.profile.full_name == "Test User"
    assert stored_user.roles[0].role.name == "user"

    db_session.delete(stored_user)
    db_session.commit()

    assert db_session.query(models.UserProfile).count() == 0
    assert db_session.query(models.UserRole).count() == 0


def test_user_role_reassignment_overwrites_existing_mapping(db_session):
    base_role = models.Role(name="user")
    commander_role = models.Role(name="commander")
    user = models.User(email="cmdr@example.com", hashed_password="secret")

    db_session.add_all([base_role, commander_role, user])
    db_session.flush()

    db_session.add(models.UserRole(user_id=user.id, role_id=base_role.id))
    db_session.commit()

    mapping = db_session.query(models.UserRole).filter_by(user_id=user.id).one()
    assert mapping.role_id == base_role.id

    mapping.role_id = commander_role.id
    db_session.commit()

    updated_mapping = db_session.query(models.UserRole).filter_by(user_id=user.id).one()
    assert updated_mapping.role_id == commander_role.id


def test_family_link_constraint_blocks_self_reference(db_session):
    user = models.User(email="family@example.com", hashed_password="secret")
    db_session.add(user)
    db_session.commit()

    link = models.UserFamilyLink(
        requestor_user_id=user.id,
        requested_user_id=user.id,
        status="pending",
    )

    db_session.add(link)
    with pytest.raises(Exception):
        db_session.commit()
    db_session.rollback()
