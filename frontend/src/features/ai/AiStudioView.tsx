import { Button } from "@/components/ui/button";
import { CircleCheck, Database, FileText, Sparkles } from "lucide-react";
import { usePlatformMetadata } from "../../lib/usePlatformMetadata";
import { SettingsTabs } from "../../app/SettingsTabs";
import { PageShell } from "../../components/ui/PageShell";
import { QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { StatCard } from "../../components/ui/StatCard";
import { StatCardSkeletonGrid } from "../../components/ui/StatCardSkeletonGrid";
import { MetricGrid } from "../../components/ui/MetricGrid";
import { ResponsiveCardGrid } from "../../components/ui/ResponsiveCardGrid";
import { Skeleton } from "../../components/ui/skeleton";
import { PromptLibraryPanel } from "./PromptLibraryPanel";
import { RetrievalDocumentsPanel } from "./RetrievalDocumentsPanel";
import { ReviewsEvaluationsPanel } from "./ReviewsEvaluationsPanel";
import { RunPlaygroundPanel } from "./RunPlaygroundPanel";
import { VersionBuilderPanel } from "./VersionBuilderPanel";
import { useAiStudioView } from "./useAiStudioView";

type AiStudioModel = ReturnType<typeof useAiStudioView>;

function AiStudioMetrics({ model, ragEnabled }: { model: AiStudioModel; ragEnabled: boolean }) {
    return <MetricGrid columns={4}>
        <StatCard dense label="Prompt templates" value={model.promptTemplates.length} description="Reusable prompts with version history" icon={<Sparkles />} />
        {ragEnabled && <StatCard dense label="Documents" value={model.documents.length} description="Indexed retrieval sources" icon={<FileText />} color="secondary" />}
        <StatCard dense label="Pending reviews" value={model.reviews.filter((item) => item.status === "pending").length} description="Runs waiting for human review" icon={<CircleCheck />} color="warning" />
        <StatCard dense label="Datasets" value={model.datasets.length} description="Saved evaluation datasets" icon={<Database />} color="success" />
    </MetricGrid>;
}

function AiStudioPanels({ model, ragEnabled }: { model: AiStudioModel; ragEnabled: boolean }) {
    return <ResponsiveCardGrid columns={2} className="mt-ui-md">
        <div id="ai-prompts" className="scroll-mt-22 min-w-0"><PromptLibraryPanel m={model} /></div>
        <div id="ai-runs" className="scroll-mt-22 min-w-0"><RunPlaygroundPanel m={model} /></div>
        <div id="ai-versions" className="scroll-mt-22 min-w-0"><VersionBuilderPanel m={model} /></div>
        {ragEnabled && <div id="ai-documents" className="scroll-mt-22 min-w-0"><RetrievalDocumentsPanel m={model} /></div>}
        <div id="ai-evaluations" className="scroll-mt-22 min-w-0"><ReviewsEvaluationsPanel m={model} /></div>
    </ResponsiveCardGrid>;
}

export default function AiStudioPage() {
    const m = useAiStudioView();
    const { data: platform } = usePlatformMetadata();
    const ragEnabled = platform?.available_features?.includes("rag") ?? false;
    if (m.isLoading) return (
        <PageShell width="wide"><SettingsTabs /><StatCardSkeletonGrid /><ResponsiveCardGrid columns={2}><Skeleton className="ui-ai-studio-skeleton" /><Skeleton className="ui-ai-studio-skeleton" /><Skeleton className="ui-ai-studio-skeleton" /><Skeleton className="ui-ai-studio-skeleton" /></ResponsiveCardGrid></PageShell>
    );
    if (m.isError || !m.overview) return <PageShell width="wide"><SettingsTabs /><QueryErrorAlert error={m.error ?? new Error("Failed to load AI studio overview.")} fallback="Failed to load AI studio overview." onRetry={() => void m.refetch()} /></PageShell>;
    const sections = [
        ["ai-prompts", "Prompts"],
        ["ai-runs", "Run"],
        ["ai-versions", "Versions"],
        ...(ragEnabled ? [["ai-documents", "Documents"]] : []),
        ["ai-evaluations", "Evaluations"],
    ] as const;
    return (
        <PageShell width="wide"><SettingsTabs />
            <AiStudioMetrics model={m} ragEnabled={ragEnabled} />
            <nav aria-label="AI Studio sections" className="mt-ui-md flex gap-ui-xs overflow-x-auto pb-1">
                {sections.map(([id, label]) => <Button key={id} variant="outline" render={<a href={`#${id}`} />}>{label}</Button>)}
            </nav>
            <AiStudioPanels model={m} ragEnabled={ragEnabled} />
        </PageShell>
    );
}
