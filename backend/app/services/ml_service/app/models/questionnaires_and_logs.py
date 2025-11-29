"""
Data structures that mirror questionnaire and log artifacts exchanged with the API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, HttpUrl


class IncidentMedia(BaseModel):
    """
    Representation of an incident media artifact (e.g., uploaded image).
    """

    incident_id: Annotated[str, Field(description="Unique ID issued for the incident.")]
    media_id: Annotated[str, Field(description="Unique ID for this media asset.")]
    filename: Annotated[str, Field(description="Original filename supplied by the client.")]
    content_type: Annotated[
        Literal["image/jpeg", "image/png", "image/webp"],
        Field(description="Captured media MIME type."),
    ]
    captured_at: Annotated[
        datetime,
        Field(description="Timestamp indicating when the media was captured."),
    ]
    source: Annotated[
        str | None,
        Field(
            default=None,
            description="Optional string describing which system/user captured the media.",
        ),
    ]
    image_url: Annotated[
        HttpUrl | None,
        Field(
            default=None,
            description="Optional remote location where the media can be retrieved.",
        ),
    ]
    notes: Annotated[
        str | None,
        Field(default=None, description="Additional operator-provided context."),
    ]



