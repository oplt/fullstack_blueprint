from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.core.schemas import RequestModel
from backend.modules.identity.models import UserProfile


class SignUpRequest(RequestModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None
    admin_invite_code: str | None = None


class SignInRequest(RequestModel):
    email: EmailStr
    password: str
    mfa_code: str | None = Field(default=None, min_length=6, max_length=6)

    @field_validator("mfa_code", mode="before")
    @classmethod
    def normalize_blank_mfa_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str) and value.strip() == "":
            return None
        return value


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None
    is_verified: bool
    is_admin: bool = False
    mfa_enabled: bool = False


class AuthSessionResponse(BaseModel):
    user: AuthUserResponse


class GenericMessageResponse(BaseModel):
    detail: str


# Email verification
class VerifyEmailRequest(RequestModel):
    token: str


class ResendVerificationRequest(RequestModel):
    email: EmailStr


# Password reset
class ForgotPasswordRequest(RequestModel):
    email: EmailStr


class ResetPasswordRequest(RequestModel):
    token: str
    new_password: str = Field(min_length=8)


# MFA
class MfaEnableResponse(BaseModel):
    secret: str
    provisioning_uri: str


class MfaVerifyRequest(RequestModel):
    code: str = Field(min_length=6, max_length=6)


class MfaDisableRequest(RequestModel):
    code: str = Field(min_length=6, max_length=6)


class UserProfileUpdate(RequestModel):
    full_name: str | None = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    is_verified: bool
    mfa_enabled: bool


class UserDirectoryResponse(BaseModel):
    id: str
    email: str
    full_name: str | None


class PasswordChangeRequest(RequestModel):
    current_password: str
    new_password: str = Field(min_length=8)


class SessionResponse(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime


class ProfileResponse(BaseModel):
    user_id: str
    bio: str | None
    avatar_url: str | None
    location: str | None
    website: str | None


class ProfileUpdate(RequestModel):
    bio: str | None = None
    location: str | None = None
    website: str | None = None


def profile_to_response(profile: UserProfile) -> ProfileResponse:
    return ProfileResponse(
        user_id=profile.user_id,
        bio=profile.bio,
        avatar_url=(
            "/api/v1/profile/avatar/content" if profile.avatar_storage_key else profile.avatar_url
        ),
        location=profile.location,
        website=profile.website,
    )
