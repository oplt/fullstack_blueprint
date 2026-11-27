import { Button } from "@/components/ui/button";
import { CircleCheck, Database, FileText, Sparkles } from "lucide-react";
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
        <PageShell width="wide"><SettingsTabs /><StatCardSkeletonGrid /><div className="mt-ui-md flex gap-ui-md"><div className="h-80 w-full animate-pulse rounded-md bg-muted" /><div className="h-72 w-full animate-pulse rounded-md bg-muted" /></div></PageShell>
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
                <StatCard label="Prompt templates" value={m.promptTemplates.length} description="Reusable prompts with version history" icon={<Sparkles />} />
                {ragEnabled && <StatCard label="Documents" value={m.documents.length} description="Indexed retrieval sources" icon={<FileText />} color="secondary" />}
                <StatCard label="Pending reviews" value={m.reviews.filter((item) => item.status === "pending").length} description="Runs waiting for human review" icon={<CircleCheck />} color="warning" />
                <StatCard label="Datasets" value={m.datasets.length} description="Saved evaluation datasets" icon={<Database />} color="success" />
            </div>
            <nav aria-label="AI Studio sections" className="mt-ui-md flex gap-ui-xs overflow-x-auto pb-1">
                {sections.map(([id, label]) => <Button key={id} variant="outline" render={<a href={`#${id}`} />}>{label}</Button>)}
            </nav>
            <div className="mt-ui-md grid items-start gap-ui-md">
                <div className="flex gap-ui-md"><div id="ai-prompts" className="scroll-mt-22"><PromptLibraryPanel m={m} /></div><div id="ai-runs" className="scroll-mt-22"><RunPlaygroundPanel m={m} /></div></div>
                <div className="flex gap-ui-md"><div id="ai-versions" className="scroll-mt-22"><VersionBuilderPanel m={m} /></div>{ragEnabled && <div id="ai-documents" className="scroll-mt-22"><RetrievalDocumentsPanel m={m} /></div>}<div id="ai-evaluations" className="scroll-mt-22"><ReviewsEvaluationsPanel m={m} /></div></div>
            </div>
        </PageShell>
    );
}
