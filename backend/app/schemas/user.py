from pydantic import BaseModel, EmailStr


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
