# AI and agents

Enable `AI_ENABLED=true` and enable AI in the platform module configuration. This module provides prompt templates and versions, generation runs, provider metadata, usage, reviews, and evaluations. Agents run one turn at a time and persist the run and trace.

The local heuristic provider supports development without credentials. Configure a production model and provider explicitly. Optional RAG and memory context enter generation through `PromptContextService`. The RAG module owns document storage, parsing, indexing, and retrieval. With RAG enabled, the AI document routes delegate to it through the compatibility service.

Use `backend/.venv/bin/python -m pytest backend/modules/ai/tests` from the repository root.
