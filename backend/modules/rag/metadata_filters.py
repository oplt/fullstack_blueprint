"""Typed metadata constraints that can only narrow an existing retrieval scope."""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

LanguageCode = Annotated[str, StringConstraints(pattern=r"^[a-z]{2,3}$")]
DocumentFormat = Literal["text", "markdown", "pdf", "docx", "csv", "xlsx"]
Page = Annotated[int, Field(strict=True, ge=1, le=2_147_483_647)]


class RetrievalMetadataFilter(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    formats: tuple[DocumentFormat, ...] | None = Field(default=None, min_length=1, max_length=6)
    languages: tuple[LanguageCode, ...] | None = Field(default=None, min_length=1, max_length=10)
    page_from: Page | None = None
    page_to: Page | None = None

    @model_validator(mode="after")
    def validate_page_range(self) -> Self:
        if (
            self.page_from is not None
            and self.page_to is not None
            and self.page_from > self.page_to
        ):
            raise ValueError("page_from must be less than or equal to page_to")
        return self
