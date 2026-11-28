"""Bounded multi-query expansion for contradiction / counter-evidence intents."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

QUERY_EXPANSION_VERSION = "contradiction-variants-v2"

_LANGUAGE_MARKERS = {
    "en": {"what", "which", "the", "and", "does", "evidence", "contradicts", "against"},
    "de": {"der", "die", "das", "und", "von", "für", "widerspricht", "belege"},
    "tr": {"ve", "bu", "şu", "için", "kanıt", "destekleyen", "çelişen"},
    "fr": {"le", "la", "les", "des", "et", "pour", "preuves", "contredisent"},
    "nl": {"de", "het", "een", "en", "van", "voor", "bewijs", "tegenspreekt"},
}
_POLARITY_WORDING = {
    "en": (
        "Evidence supporting or agreeing with",
        "Evidence contradicting, challenging, or presenting counter-arguments to",
    ),
    "de": (
        "Belege, die unterstützen oder zustimmen",
        "Belege, die widersprechen, herausfordern oder Gegenargumente darstellen",
    ),
    "tr": (
        "destekleyen veya aynı fikirde olan kanıtlar",
        "çelişen, karşı çıkan veya karşı argüman sunan kanıtlar",
    ),
    "fr": (
        "éléments qui soutiennent ou confirment",
        "éléments qui contredisent, remettent en cause ou présentent des contre-arguments à",
    ),
    "nl": (
        "Bewijs dat ondersteunt of bevestigt",
        "Bewijs dat tegenspreekt, betwist of tegenargumenten geeft bij",
    ),
}


@dataclass(frozen=True, slots=True)
class QueryVariant:
    label: str
    text: str
    lexical_text: str | None = None
    dense_text: str | None = None
    language: str = "unknown"


class QueryExpansionService:
    """Deterministic, bounded variants — no agent loop."""

    def expand_contradiction(self, query: str) -> list[QueryVariant]:
        q = (query or "").strip()
        if not q:
            return []
        language = _detect_language(q)
        support, contradict = _POLARITY_WORDING[language]
        return [
            QueryVariant(
                label="neutral",
                text=q,
                lexical_text=q,
                dense_text=q,
                language=language,
            ),
            QueryVariant(
                label="support",
                text=f"{support}: {q}",
                lexical_text=q,
                dense_text=f"{support}: {q}",
                language=language,
            ),
            QueryVariant(
                label="contradict",
                text=f"{contradict}: {q}",
                lexical_text=q,
                dense_text=f"{contradict}: {q}",
                language=language,
            ),
        ]

    def expand_if_needed(self, query: str, *, multi_query: bool) -> list[QueryVariant]:
        if not multi_query:
            text = (query or "").strip()
            return [QueryVariant(label="original", text=text, language=_detect_language(text))]
        return self.expand_contradiction(query)


def _detect_language(query: str) -> str:
    normalized = unicodedata.normalize("NFC", query).replace("İ", "i").casefold()
    words = set(re.findall(r"[^\W\d_]+", normalized))
    scores = {language: len(words & markers) for language, markers in _LANGUAGE_MARKERS.items()}
    best = max(scores.values())
    winners = [language for language, score in scores.items() if score == best]
    return winners[0] if best and len(winners) == 1 else "en"
