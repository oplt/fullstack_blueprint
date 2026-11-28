from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.db.dependencies import get_db
from backend.modules.ai.document_routes import router as document_router
from backend.modules.ai.evaluation_routes import router as evaluation_router
from backend.modules.ai.gateway import AiModelGateway
from backend.modules.ai.overview import AiOverviewService
from backend.modules.ai.prompt_routes import router as prompt_router
from backend.modules.ai.review_routes import router as review_router
from backend.modules.ai.run_routes import router as run_router
from backend.modules.ai.schemas import (
    AiModuleOverviewResponse,
    AiProviderDescriptor,
    _dataset_to_response,
    _document_to_response,
    _prompt_template_to_response,
    run_to_response,
)
from backend.modules.ai.stream_routes import router as stream_router
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User

router = APIRouter()
@router.get("/overview", response_model=AiModuleOverviewResponse)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AiOverviewService(db)
    overview = await service.get_overview(current_user)
    return AiModuleOverviewResponse(
        providers=overview["providers"],
        prompt_templates=[
            _prompt_template_to_response(item) for item in overview["prompt_templates"]
        ],
        recent_runs=[run_to_response(item) for item in overview["recent_runs"]],
        documents=[_document_to_response(item) for item in overview["documents"]],
        datasets=[_dataset_to_response(item) for item in overview["datasets"]],
    )


@router.get("/providers", response_model=list[AiProviderDescriptor])
async def list_providers():
    return AiModelGateway.list_provider_descriptors()

router.include_router(prompt_router)
if settings.RAG_ENABLED:
    router.include_router(document_router)
router.include_router(run_router)
router.include_router(stream_router)
router.include_router(review_router)
router.include_router(evaluation_router)
