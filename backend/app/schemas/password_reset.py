from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=20)
    new_password: str = Field(min_length=6, max_length=128)
