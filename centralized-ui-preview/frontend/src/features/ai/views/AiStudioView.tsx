import { Button } from "@/components/ui/button";
import { CircleCheck as ReviewIcon, Database as DatasetIcon, FileText as DocumentIcon, Sparkles as PromptIcon } from "lucide-react";
import { usePlatformMetadata } from "../../../hooks/usePlatformMetadata";
import { SettingsTabs } from "../../../components/layout/SettingsTabs";
import { PageShell } from "../../../components/ui/PageShell";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { StatCard } from "../../../components/ui/StatCard";
import { StatCardSkeletonGrid } from "../../../components/ui/StatCardSkeletonGrid";
import { PromptLibraryPanel } from "../components/PromptLibraryPanel";
import { RetrievalDocumentsPanel } from "../components/RetrievalDocumentsPanel";
import { ReviewsEvaluationsPanel } from "../components/ReviewsEvaluationsPanel";
import { RunPlaygroundPanel } from "../components/RunPlaygroundPanel";
import { VersionBuilderPanel } from "../components/VersionBuilderPanel";
import { useAiStudioView } from "../hooks/useAiStudioView";

export default function AiStudioPage() {
    const m = useAiStudioView();
    const { data: platform } = usePlatformMetadata();
    const ragEnabled = platform?.available_features?.includes("rag") ?? false;
    if (m.isLoading) return (
        <PageShell width="wide"><SettingsTabs /><StatCardSkeletonGrid /><div className="flex ui-auto-ai-studio-view-ai-studio-page-div"><div className="w-full ui-auto-ai-studio-view-ai-studio-page-div-458a448" /><div className="w-full ui-auto-ai-studio-view-ai-studio-page-div-afb01fd" /></div></PageShell>
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
            <div className="grid gap-ui-md">
                <StatCard label="Prompt templates" value={m.promptTemplates.length} description="Reusable prompts with version history" icon={<PromptIcon />} />
                {ragEnabled && <StatCard label="Documents" value={m.documents.length} description="Indexed retrieval sources" icon={<DocumentIcon />} color="secondary" />}
                <StatCard label="Pending reviews" value={m.reviews.filter((item) => item.status === "pending").length} description="Runs waiting for human review" icon={<ReviewIcon />} color="warning" />
                <StatCard label="Datasets" value={m.datasets.length} description="Saved evaluation datasets" icon={<DatasetIcon />} color="success" />
            </div>
            <nav aria-label="AI Studio sections" className="flex overflow-x-auto ui-auto-ai-studio-view-ai-studio-page-nav">
                {sections.map(([id, label]) => <Button key={id} variant="outline" render={<a href={`#${id}`} />}>{label}</Button>)}
            </nav>
            <div className="grid items-start ui-auto-ai-studio-view-ai-studio-page-div-a1fe517">
                <div className="flex gap-ui-md"><div id="ai-prompts" className="ui-auto-ai-studio-view-ai-studio-page-div-25cba43"><PromptLibraryPanel m={m} /></div><div id="ai-runs" className="ui-auto-ai-studio-view-ai-studio-page-div-25cba43-x"><RunPlaygroundPanel m={m} /></div></div>
                <div className="flex gap-ui-md"><div id="ai-versions" className="ui-auto-ai-studio-view-ai-studio-page-div-25cba43-x-x"><VersionBuilderPanel m={m} /></div>{ragEnabled && <div id="ai-documents" className="ui-auto-ai-studio-view-ai-studio-page-div-25cba43-x-x-x"><RetrievalDocumentsPanel m={m} /></div>}<div id="ai-evaluations" className="ui-auto-ai-studio-view-ai-studio-page-div-25cba43-x-x-x-x"><ReviewsEvaluationsPanel m={m} /></div></div>
            </div>
        </PageShell>
    );
}
