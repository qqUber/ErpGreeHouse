"""Messenger source registry and validation helpers.

This module centralizes source-to-database mapping for bot channels.
It keeps existing defaults for Telegram/VK and allows extension via env config.
"""

from __future__ import annotations

import json
import os
import re

Source = str

DEFAULT_SOURCE_COLUMN_MAPPINGS: dict[str, str] = {
    "tg": "telegram_id",
    "vk": "vk_id",
}

_SQL_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _is_valid_identifier(value: str) -> bool:
    return bool(_SQL_IDENTIFIER_RE.match(value))


def _load_env_mapping() -> dict[str, str]:
    raw = os.getenv("CRM_MESSENGER_SOURCE_MAP", "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid CRM_MESSENGER_SOURCE_MAP JSON") from exc
    if not isinstance(data, dict):
        raise ValueError("CRM_MESSENGER_SOURCE_MAP must be a JSON object")

    normalized: dict[str, str] = {}
    for source, column in data.items():
        source_key = str(source).strip().lower()
        column_name = str(column).strip()
        if not source_key:
            continue
        if not _is_valid_identifier(column_name):
            raise ValueError(f"Invalid DB column identifier for source '{source_key}'")
        normalized[source_key] = column_name
    return normalized


def get_source_column_mappings() -> dict[str, str]:
    mapping = dict(DEFAULT_SOURCE_COLUMN_MAPPINGS)
    mapping.update(_load_env_mapping())
    return mapping


def get_supported_sources() -> tuple[str, ...]:
    return tuple(sorted(get_source_column_mappings().keys()))


def normalize_source(source: Source) -> str:
    source_key = str(source).strip().lower()
    if not source_key:
        raise ValueError("Source cannot be empty")
    return source_key


def resolve_source_column(source: Source) -> str:
    source_key = normalize_source(source)
    mapping = get_source_column_mappings()
    if source_key not in mapping:
        raise ValueError(f"Invalid source: {source_key}. Must be one of: {list(mapping.keys())}")
    return mapping[source_key]
