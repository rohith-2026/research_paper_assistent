from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from bson import ObjectId

from app.core.config import settings
from app.repositories.user_repo import UserRepo

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = creds.credentials

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    users_repo = UserRepo()
    user = await users_repo.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user["id"] = str(user["_id"])
    return user
