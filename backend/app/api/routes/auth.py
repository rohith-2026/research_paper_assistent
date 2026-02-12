from fastapi import APIRouter, HTTPException, Body, Depends, Request

from app.services.auth_route_service import AuthRouteService
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UpdatePreferencesRequest
from app.schemas.password_reset import ForgotPasswordRequest, ResetPasswordRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


service = AuthRouteService()


# -----------------------------
# Register
# -----------------------------
@router.post("/register")
async def register(payload: RegisterRequest):
    try:
        return await service.register(payload.name, payload.email, payload.password)
    except ValueError as e:
        detail = str(e)
        if detail == "Signups disabled":
            raise HTTPException(status_code=403, detail=detail)
        raise HTTPException(status_code=409, detail="Email already registered")


# -----------------------------
# Login
# -----------------------------
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    try:
        tokens = await service.login(
            payload.email,
            payload.password,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
        return TokenResponse(**tokens)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid email or password")


# -----------------------------
# Refresh
# -----------------------------
@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str = Body(..., embed=True)):
    try:
        tokens = await service.refresh(refresh_token)
        return TokenResponse(**tokens)
    except ValueError as e:
        detail = "User not found" if str(e) == "User not found" else "Invalid refresh token"
        raise HTTPException(status_code=401, detail=detail)


# -----------------------------
# Logout
# -----------------------------
@router.post("/logout")
async def logout(refresh_token: str = Body(..., embed=True)):
    res = await service.logout(refresh_token)
    if not res.get("revoked"):
        raise HTTPException(status_code=400, detail="Token already revoked or invalid")
    return {"message": "Logged out"}


# -----------------------------
# Logout All
# -----------------------------
@router.post("/logout-all")
async def logout_all(user=Depends(get_current_user)):
    return await service.logout_all(str(user["_id"]))


# -----------------------------
# Protected proof route
# -----------------------------
@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user.get("created_at"),
        "last_login_at": user.get("last_login_at"),
        "analytics_opt_out": user.get("analytics_opt_out", False),
    }


@router.get("/usage")
async def account_usage(user=Depends(get_current_user)):
    return await service.account_usage(str(user["_id"]))


@router.get("/export")
async def export_account_data(user=Depends(get_current_user)):
    return await service.export_data(str(user["_id"]))


@router.patch("/preferences")
async def update_preferences(payload: UpdatePreferencesRequest, user=Depends(get_current_user)):
    try:
        return await service.update_preferences(
            user_id=str(user["_id"]),
            analytics_opt_out=payload.analytics_opt_out,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# -----------------------------
# Delete Account
# -----------------------------
@router.delete("/me")
async def delete_me(user=Depends(get_current_user)):
    try:
        return await service.delete_account(str(user["_id"]))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/me/data")
async def delete_me_data(user=Depends(get_current_user)):
    try:
        return await service.delete_account_data(str(user["_id"]))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================
# OK PART 2: Forgot Password + Reset Password
# =========================================================

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """
    DEV MODE:
      - generates token and returns it in response.
    PRODUCTION:
      - send token to email + return generic message.
    """
    return await service.forgot_password(payload.email)


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    try:
        return await service.reset_password(payload.reset_token, payload.new_password)
    except ValueError as e:
        detail = str(e)
        raise HTTPException(status_code=400, detail=detail)
