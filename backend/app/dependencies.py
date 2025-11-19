from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.database import get_db
from app.repositories.user_repository import UserRepository
from app.models.user_family_models import User
from typing import List

async def get_current_user(
    request: Request, 
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Reads session cookie, fetches user from DB. 
    Raises 401 if not authenticated.
    """
    user_id_str = request.session.get('user_id')
    
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Not authenticated"
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id_str))

    if not user:
        # Session is stale (user deleted?)
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User not found"
        )
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        # Assuming user.role is loaded. If strictly using IDs:
        # 1=Civilian, 2=Responder, 3=Commander
        # Ideally, map these IDs to strings or check user.role.name
        
        if not user.role:
            raise HTTPException(status_code=403, detail="User has no role assigned.")
            
        if user.role.name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Operation not permitted"
            )
        return user