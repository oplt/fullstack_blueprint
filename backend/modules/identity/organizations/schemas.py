from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.core.schemas import RequestModel

OrganizationRole = Literal["owner", "admin", "member"]


class OrganizationCreate(RequestModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    name: str
    slug: str
    created_at: datetime


class OrganizationMemberCreate(RequestModel):
    user_id: str
    role: Literal["admin", "member"] = "member"


class OrganizationMemberResponse(BaseModel):
    user_id: str
    email: str
    full_name: str | None
    role: OrganizationRole
