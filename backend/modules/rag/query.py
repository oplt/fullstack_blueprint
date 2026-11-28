from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from backend.modules.rag.domain import RetrievalIntent

MIN_COMPARISON_ENTITY_COUNT = 2

_QUOTED = re.compile(r"""(?:"[^"\n]+"|“[^”\n]+”|(?<!\w)'[^'\n]+'(?!\w))""")
_COMPARISON = re.compile(
    r"\b(compare|comparison|versus|vs\.?|difference between|vergleich|gegenüber|"
    r"unterschied zwischen|comparer|comparaison|contre|différence entre)\b",
    re.I,
)
_CONTRADICTION = re.compile(
    r"\b(contradict(?:s|ion|ory)?|counter[ -]?evidence|disagree|challenge|oppos(?:e|ing)|"
    r"widerspricht|gegenbeweis|contredit|preuve contraire|tegenspreekt|tegenbewijs|"
    r"çelişen|çelişiyor|karşı kanıt)\b",
    re.I,
)
_DEFINITION = re.compile(
    r"^(what is|what are|define|definition of|meaning of|was ist|was sind|"
    r"définir|qu'est-ce que)\b",
    re.I,
)
_CITATION_LOOKUP = re.compile(r"\b(citation|cite|cited|source|reference|referenz|quelle)\b", re.I)
_FACT = re.compile(r"^(who|when|where|which year|how many)\b", re.I)
_ENTITY = re.compile(r"\b[A-ZÀ-ÖØ-Þ][\wÀ-ÖØ-öø-ÿ'-]*\b")
_DATE = re.compile(r"\b(?:18|19|20)\d{2}\b")
_IDENTIFIER = re.compile(r"(?<!\w)[a-z0-9]+(?:[-_./:][a-z0-9]+)+(?!\w)", re.I)


def quoted_phrase(query: str) -> str | None:
    match = _QUOTED.search(query)
    return match.group()[1:-1] if match else None


def exact_identifier(query: str) -> str | None:
    """Find one explicit mixed alphanumeric identifier for lexical lookup."""
    return next(
        (
            identifier
            for identifier in _IDENTIFIER.findall(query)
            if any(char.isalpha() for char in identifier)
            and any(char.isdigit() for char in identifier)
        ),
        None,
    )


@dataclass(frozen=True, slots=True)
class QueryAnalysis:
    intent: RetrievalIntent
    reasons: tuple[str, ...]
    lexical_phrase_boost: bool = False
    entity_count: int = 0
    has_date: bool = False

    def to_dict(self) -> dict:
        return {
            "resolved_intent": self.intent.value,
            "reasons": list(self.reasons),
            "lexical_phrase_boost": self.lexical_phrase_boost,
            "entity_count": self.entity_count,
            "has_date": self.has_date,
        }


def analyze_query(query: str) -> QueryAnalysis:
    text = (query or "").strip()
    reasons: list[str] = []
    phrase_boost = quoted_phrase(text) is not None
    entities = tuple(dict.fromkeys(_ENTITY.findall(text)))
    entity_count = len(entities[1:] if entities and text.startswith(entities[0]) else entities)
    has_date = bool(_DATE.search(text))
    if phrase_boost:
        reasons.append("quoted_phrase")
    if has_date:
        reasons.append("date_marker")
    if _CONTRADICTION.search(text):
        return QueryAnalysis(
            RetrievalIntent.CONTRADICTION,
            tuple([*reasons, "contradiction_marker"]),
            phrase_boost,
            entity_count,
            has_date,
        )
    if _COMPARISON.search(text) and entity_count >= MIN_COMPARISON_ENTITY_COUNT:
        return QueryAnalysis(
            RetrievalIntent.COMPARISON,
            tuple([*reasons, "comparison_marker", "two_or_more_entities"]),
            phrase_boost,
            entity_count,
            has_date,
        )
    if _DEFINITION.search(text):
        return QueryAnalysis(
            RetrievalIntent.DEFINITION,
            tuple([*reasons, "definition_pattern"]),
            phrase_boost,
            entity_count,
            has_date,
        )
    if _FACT.search(text):
        return QueryAnalysis(
            RetrievalIntent.FACT,
            tuple([*reasons, "fact_pattern"]),
            phrase_boost,
            entity_count,
            has_date,
        )
    if _CITATION_LOOKUP.search(text):
        reasons.append("citation_lookup")
    return QueryAnalysis(
        RetrievalIntent.EVIDENCE,
        tuple(reasons or ["default_evidence"]),
        phrase_boost,
        entity_count,
        has_date,
    )


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
