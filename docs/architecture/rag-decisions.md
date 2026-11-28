# RAG consolidation decisions

## AI document integration

The composition root can inject `backend.modules.rag.service.RagDocumentService(db)` into the AI document capability. Its list_documents, get_document, create_from_text, create_from_upload and retrieve_chunks methods preserve the existing user-ID arguments, results and errors. The adapter returns AiDocumentView for document responses. AI owns HTTP forwarding and feature-gate responses. RAG owns storage, ownership checks, ingestion and retrieval.
