from __future__ import annotations
import re
from dataclasses import dataclass
from backend.modules.memory.domain import MemoryLevel, MemorySource, MemoryType
from backend.modules.memory.policies import contains_secret, is_ephemeral_statement
from backend.modules.memory.domain import MemoryItem


TASK_STATE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)\b(current(ly)?|working on|in progress|next step|todo|task)\b"),
    re.compile(r"(?i)\b(plan|step \d+|unfinished|pending)\b"),
)

PROJECT_DECISION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)\b(chosen|selected|using|decided|architecture|stack)\b"),
    re.compile(r"(?i)\b(postgres|postgresql|mysql|mongodb|redis|fastapi|django)\b"),
)

PREFERENCE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)\b(prefer|likes?|wants?|always use|please use)\b"),
    re.compile(r"(?i)\b(beginner.friendly|detailed|concise|examples?)\b"),
)

EVENT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)\b(completed|finished|started|changed|corrected|onboarding)\b"),
)

AGENT_RULE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)\b(always|never|must|should always|tool preference)\b"),
)


@dataclass(slots=True)
class RoutedMemory:
    content: str
    memory_level: MemoryLevel
    memory_type: MemoryType
    confidence: float
    source: MemorySource = MemorySource.CHAT


class MemoryRouter:
    """Route candidate facts to the correct memory layer."""

    def route(
        self,
        *,
        content: str,
        explicit_level: MemoryLevel | None = None,
        explicit_type: MemoryType | None = None,
        is_task_state: bool = False,
        is_project_decision: bool = False,
        is_agent_rule: bool = False,
        is_event: bool = False,
    ) -> RoutedMemory:
        if explicit_level and explicit_type:
            return RoutedMemory(
                content=content,
                memory_level=explicit_level,
                memory_type=explicit_type,
                confidence=0.9,
            )

        if is_task_state or any(p.search(content) for p in TASK_STATE_PATTERNS):
            return RoutedMemory(
                content=content,
                memory_level=MemoryLevel.SESSION,
                memory_type=MemoryType.TASK_STATE,
                confidence=0.7,
            )

        if is_project_decision or any(p.search(content) for p in PROJECT_DECISION_PATTERNS):
            return RoutedMemory(
                content=content,
                memory_level=MemoryLevel.PROJECT,
                memory_type=MemoryType.DECISION,
                confidence=0.82,
            )

        if is_agent_rule or any(p.search(content) for p in AGENT_RULE_PATTERNS):
            return RoutedMemory(
                content=content,
                memory_level=MemoryLevel.AGENT,
                memory_type=MemoryType.INSTRUCTION,
                confidence=0.78,
            )

        if is_event or any(p.search(content) for p in EVENT_PATTERNS):
            return RoutedMemory(
                content=content,
                memory_level=MemoryLevel.EPISODIC,
                memory_type=MemoryType.EVENT,
                confidence=0.75,
            )

        if any(p.search(content) for p in PREFERENCE_PATTERNS):
            return RoutedMemory(
                content=content,
                memory_level=MemoryLevel.USER,
                memory_type=MemoryType.PREFERENCE,
                confidence=0.85,
            )

        return RoutedMemory(
            content=content,
            memory_level=MemoryLevel.USER,
            memory_type=MemoryType.FACT,
            confidence=0.72,
        )


EXTRACT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)(user prefers? .{5,120}|prefers? (beginner|detailed|concise).{0,80})"),
    re.compile(r"(?i)(building|working on|creating) (a |an )?.{5,80}"),
    re.compile(r"(?i)(wants?|needs?) .{0,40}(examples?|fastapi|postgres|react)"),
    re.compile(r"(?i)(for project .{3,60},? (the )?(chosen|using|db is) .{3,80})"),
    re.compile(r"(?i)(current plan|next step|working on task)[:.]? .{5,120}"),
)
MIN_DURABLE_MEMORY_SENTENCE_CHARS = 12


@dataclass(slots=True)
class ExtractionCandidate:
    content: str
    routed: RoutedMemory
    source_message_id: str | None = None


class MemoryExtractor:
    """Decide what durable facts to store after a conversation turn."""

    def __init__(self, router: MemoryRouter | None = None):
        self.router = router or MemoryRouter()

    def extract_from_turn(
        self,
        *,
        user_message: str,
        assistant_message: str,
        source_message_id: str | None = None,
    ) -> list[ExtractionCandidate]:
        candidates: list[ExtractionCandidate] = []
        for text in (user_message, assistant_message):
            for match in self._iter_sentences(text):
                normalized = match.strip()
                if len(normalized) < MIN_DURABLE_MEMORY_SENTENCE_CHARS:
                    continue
                if contains_secret(normalized):
                    continue
                if is_ephemeral_statement(normalized):
                    continue
                if not self._looks_durable(normalized):
                    continue
                routed = self.router.route(content=normalized)
                candidates.append(
                    ExtractionCandidate(
                        content=normalized,
                        routed=routed,
                        source_message_id=source_message_id,
                    )
                )
        return self._dedupe_candidates(candidates)

    def _iter_sentences(self, text: str) -> list[str]:
        parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
        extracted: list[str] = []
        for raw_part in parts:
            part = raw_part.strip()
            if part:
                extracted.append(part)
            for pattern in EXTRACT_PATTERNS:
                for match in pattern.findall(part):
                    if isinstance(match, tuple):
                        extracted.append(" ".join(m for m in match if m))
                    else:
                        extracted.append(str(match))
        return extracted

    def _looks_durable(self, text: str) -> bool:
        if any(pattern.search(text) for pattern in EXTRACT_PATTERNS):
            return True
        durable_markers = (
            "prefer",
            "building",
            "project",
            "chosen",
            "using",
            "goal",
            "always",
            "instruction",
            "postgres",
            "fastapi",
        )
        lowered = text.lower()
        return any(marker in lowered for marker in durable_markers)

    def _dedupe_candidates(
        self, candidates: list[ExtractionCandidate]
    ) -> list[ExtractionCandidate]:
        seen: set[str] = set()
        unique: list[ExtractionCandidate] = []
        for candidate in candidates:
            key = candidate.content.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(candidate)
        return unique


class MemoryConsolidator:
    """Merge duplicates and prefer newer confirmed facts."""

    def consolidate(self, items: list[MemoryItem]) -> list[MemoryItem]:
        if not items:
            return []

        grouped: dict[str, MemoryItem] = {}
        for item in items:
            key = self._similarity_key(item.content)
            existing = grouped.get(key)
            if existing is None:
                grouped[key] = item
                continue
            grouped[key] = self._pick_preferred(existing, item)
        return list(grouped.values())

    def mark_contradictions(self, items: list[MemoryItem]) -> list[MemoryItem]:
        """Drop older contradicted items when a newer confirmed fact exists."""
        by_type: dict[str, list[MemoryItem]] = {}
        for item in items:
            key = f"{item.metadata.memory_type.value}:{item.metadata.memory_level.value}"
            by_type.setdefault(key, []).append(item)

        result: list[MemoryItem] = []
        for group in by_type.values():
            if len(group) == 1:
                result.append(group[0])
                continue
            group.sort(key=self._recency_score, reverse=True)
            winner = group[0]
            for challenger in group[1:]:
                if self._contradicts(winner.content, challenger.content):
                    continue
                result.append(challenger)
            result.append(winner)
        return result

    def _similarity_key(self, content: str) -> str:
        normalized = " ".join(content.lower().split())
        return normalized[:160]

    def _recency_score(self, item: MemoryItem) -> float:
        confirmed = item.metadata.last_confirmed_at or item.metadata.created_at
        seen = item.metadata.last_seen_at or confirmed
        base = 0.0
        if confirmed:
            base += confirmed.timestamp()
        if seen:
            base += seen.timestamp() * 0.001
        if item.metadata.confidence:
            base += item.metadata.confidence
        return base

    def _pick_preferred(self, left: MemoryItem, right: MemoryItem) -> MemoryItem:
        return left if self._recency_score(left) >= self._recency_score(right) else right

    def _contradicts(self, left: str, right: str) -> bool:
        left_l = left.lower()
        right_l = right.lower()
        negations = ("not ", "no longer ", "don't ", "do not ")
        for neg in negations:
            if neg in left_l and right_l.replace(neg, "") in left_l:
                return True
            if neg in right_l and left_l.replace(neg, "") in right_l:
                return True
        return False
