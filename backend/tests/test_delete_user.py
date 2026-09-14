"""Unit tests for DELETE /api/v1/users/{user_id} endpoint logic.
Validates:
1. Super admin cannot delete their own account.
2. 404 is raised if target user does not exist.
3. Super admin cannot delete the last active Super Admin account.
4. Hard delete succeeds for users without immutable foreign keys.
5. Soft-deactivation occurs gracefully if IntegrityError is raised (compliance preservation).
6. Lead reassignment executes when reassign_leads_to is provided.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.api.v1.users import delete_user
from app.models.rbac import Role
from app.models.user import User


def _make_user(name: str, email: str, role_name: str, is_active: bool = True) -> User:
    role = MagicMock(spec=Role)
    role.id = uuid.uuid4()
    role.name = role_name

    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.name = name
    user.email = email
    user.role = role
    user.role_id = role.id
    user.is_active = is_active
    return user


@pytest.mark.asyncio
async def test_cannot_delete_own_account():
    current_admin = _make_user("Super Admin", "super@crm.com", "super_admin")
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await delete_user(
            user_id=current_admin.id,
            db=db,
            current_user=current_admin,
        )
    assert exc_info.value.status_code == 400
    assert "cannot delete your own account" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_user_not_found():
    current_admin = _make_user("Super Admin", "super@crm.com", "super_admin")
    target_id = uuid.uuid4()

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc_info:
        await delete_user(
            user_id=target_id,
            db=db,
            current_user=current_admin,
        )
    assert exc_info.value.status_code == 404
    assert "user not found" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_cannot_delete_last_super_admin():
    current_admin = _make_user("Super Admin 1", "super1@crm.com", "super_admin")
    target_admin = _make_user("Super Admin 2", "super2@crm.com", "super_admin")

    db = AsyncMock()
    # 1. return target_admin
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = target_admin
    db.execute.return_value = mock_result
    # 2. superadmin_count query returns 1
    db.scalar.return_value = 1

    with pytest.raises(HTTPException) as exc_info:
        await delete_user(
            user_id=target_admin.id,
            db=db,
            current_user=current_admin,
        )
    assert exc_info.value.status_code == 400
    assert "last active super admin" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_hard_delete_user_cleanly():
    current_admin = _make_user("Super Admin", "super@crm.com", "super_admin")
    target_agent = _make_user("Agent Bob", "bob@crm.com", "agent")

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = target_agent
    db.execute.return_value = mock_result

    # Subtransaction context manager
    nested_cm = AsyncMock()
    db.begin_nested = MagicMock()
    db.begin_nested.return_value.__aenter__.return_value = nested_cm
    db.begin_nested.return_value.__aexit__.return_value = None

    res = await delete_user(
        user_id=target_agent.id,
        db=db,
        current_user=current_admin,
    )

    assert res["deleted"] is True
    assert "permanently removed" in res["message"]
    db.delete.assert_called_once_with(target_agent)
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_deactivate_user_on_foreign_key_integrity_error():
    current_admin = _make_user("Super Admin", "super@crm.com", "super_admin")
    target_agent = _make_user("Agent Alice", "alice@crm.com", "agent")

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = target_agent
    db.execute.return_value = mock_result

    # Flush inside begin_nested raises IntegrityError (leads / audit history exists)
    nested_cm = AsyncMock()
    nested_cm.flush.side_effect = IntegrityError("leads_agent_id_fkey", params={}, orig=Exception())
    db.begin_nested = MagicMock()
    db.begin_nested.return_value.__aenter__.return_value = nested_cm
    db.begin_nested.return_value.__aexit__.side_effect = IntegrityError("leads_agent_id_fkey", params={}, orig=Exception())
    db.flush.side_effect = IntegrityError("leads_agent_id_fkey", params={}, orig=Exception())

    res = await delete_user(
        user_id=target_agent.id,
        db=db,
        current_user=current_admin,
    )

    assert res["deleted"] is False
    assert res["deactivated"] is True
    assert target_agent.is_active is False
    assert "deactivated to preserve compliance" in res["message"]
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_reassign_leads_before_delete():
    current_admin = _make_user("Super Admin", "super@crm.com", "super_admin")
    target_agent = _make_user("Agent Bob", "bob@crm.com", "agent")
    reassign_target = _make_user("Agent Charlie", "charlie@crm.com", "agent")

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = target_agent
    db.execute.return_value = mock_result
    db.get.return_value = reassign_target

    nested_cm = AsyncMock()
    db.begin_nested = MagicMock()
    db.begin_nested.return_value.__aenter__.return_value = nested_cm
    db.begin_nested.return_value.__aexit__.return_value = None

    res = await delete_user(
        user_id=target_agent.id,
        reassign_leads_to=reassign_target.id,
        db=db,
        current_user=current_admin,
    )

    assert res["deleted"] is True
    # db.execute was called to update leads.agent_id
    assert db.execute.call_count >= 2
    db.commit.assert_called_once()
