# tests/test_user_family_models.py
import pytest
from sqlalchemy.exc import IntegrityError
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

from app.models.user_family_models import (
    Role,
    User,
    UserProfile,
    UserMedicalProfile,
)


def test_role_basic_create_and_repr(db_session):
    role = Role(role_id=1, name="civilian", description="Regular user")
    db_session.add(role)
    db_session.commit()

    assert role.role_id == 1
    assert "civilian" in repr(role)


def test_role_name_unique_constraint(db_session):
    r1 = Role(role_id=2, name="unique_role")
    r2 = Role(role_id=3, name="unique_role")

    db_session.add_all([r1, r2])
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_user_create_with_defaults_and_relationships(db_session):
    role = Role(role_id=10, name="test_role")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id, email="user@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.user_id is not None
    assert user.is_active is True
    assert user.role is role
    assert user.created_at is not None
    assert user.updated_at is not None


def test_user_email_and_phone_unique_constraints(db_session):
    role = Role(role_id=11, name="uniq_role")
    db_session.add(role)
    db_session.commit()

    u1 = User(role_id=role.role_id, email="dup@example.com", phone_number="111")
    u2 = User(role_id=role.role_id, email="dup@example.com", phone_number="222")

    db_session.add_all([u1, u2])
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Ensure the first user was not committed
    assert db_session.query(User).filter_by(email="dup@example.com").count() == 0

    u3 = User(role_id=role.role_id, email="other@example.com", phone_number="111")
    u4 = User(role_id=role.role_id, email="another@example.com", phone_number="111")
    db_session.add_all([u3, u4])
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    assert db_session.query(User).filter_by(phone_number="111").count() == 0


def test_user_geometry_roundtrip(db_session):
    role = Role(role_id=12, name="geom_role")
    db_session.add(role)
    db_session.commit()

    point = Point(77.5, 12.9)
    user = User(
        role_id=role.role_id,
        last_known_location=from_shape(point, srid=4326),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    loaded_point = to_shape(user.last_known_location)
    assert loaded_point.x == pytest.approx(point.x)
    assert loaded_point.y == pytest.approx(point.y)


def test_user_profile_one_to_one(db_session):
    role = Role(role_id=13, name="profile_role")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()

    profile = UserProfile(
        user_id=user.user_id,
        full_name="John Doe",
        emergency_contact_name="Jane Doe",
        emergency_contact_phone="1234567890",
    )
    db_session.add(profile)
    db_session.commit()

    db_session.refresh(user)
    assert user.profile is profile
    assert profile.user is user


def test_user_medical_profile_one_to_one_and_defaults(db_session):
    role = Role(role_id=14, name="med_role")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()

    medical = UserMedicalProfile(
        user_id=user.user_id,
        public_user_code="PUB123",
        blood_group="O+",
    )
    db_session.add(medical)
    db_session.commit()
    db_session.refresh(medical)

    assert medical.user is user
    assert medical.consent_flags is not None
    # default is empty JSON object
    assert medical.consent_flags == {} or medical.consent_flags == {}.copy()


def test_cascade_delete_user_profile_and_medical(db_session):
    role = Role(role_id=15, name="cascade_role")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()

    profile = UserProfile(
        user_id=user.user_id,
        full_name="To Delete",
    )
    medical = UserMedicalProfile(
        user_id=user.user_id,
        public_user_code="DEL123",
    )
    db_session.add_all([profile, medical])
    db_session.commit()

    user_id = user.user_id

    db_session.delete(user)
    db_session.commit()

    assert db_session.get(User, user_id) is None
    assert db_session.get(UserProfile, user_id) is None
    assert db_session.get(UserMedicalProfile, user_id) is None
