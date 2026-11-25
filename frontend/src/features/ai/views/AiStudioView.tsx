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
        <PageShell width="wide"><SettingsTabs /><StatCardSkeletonGrid /><div className="flex gap-[16px]" style={{ marginTop: 16 }}><div className="animate-pulse rounded-md bg-muted" style={{
            height: 320
        }} /><div className="animate-pulse rounded-md bg-muted" style={{
            height: 280
        }} /></div></PageShell>
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
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
                <StatCard label="Prompt templates" value={m.promptTemplates.length} description="Reusable prompts with version history" icon={<PromptIcon />} />
                {ragEnabled && <StatCard label="Documents" value={m.documents.length} description="Indexed retrieval sources" icon={<DocumentIcon />} color="secondary" />}
                <StatCard label="Pending reviews" value={m.reviews.filter((item) => item.status === "pending").length} description="Runs waiting for human review" icon={<ReviewIcon />} color="warning" />
                <StatCard label="Datasets" value={m.datasets.length} description="Saved evaluation datasets" icon={<DatasetIcon />} color="success" />
            </div>
            <div

                aria-label="AI Studio sections"
                className="flex flex-row gap-[8px]"
                style={{ marginTop: 16, overflowX: "auto", paddingBottom: 4, display: "" }}>
                {sections.map(([id, label]) => <Button key={id} variant="outline" render={<a href={`#${id}`} />}>{label}</Button>)}
            </div>
            <div style={{ marginTop: 16, display: "grid", gap: 16, gridTemplateColumns: "1fr", alignItems: "start" }}>
                <div className="flex gap-[16px]"><div id="ai-prompts" style={{ scrollMarginTop: 88 }}><PromptLibraryPanel m={m} /></div><div id="ai-runs" style={{ scrollMarginTop: 88 }}><RunPlaygroundPanel m={m} /></div></div>
                <div className="flex gap-[16px]"><div id="ai-versions" style={{ scrollMarginTop: 88 }}><VersionBuilderPanel m={m} /></div>{ragEnabled && <div id="ai-documents" style={{ scrollMarginTop: 88 }}><RetrievalDocumentsPanel m={m} /></div>}<div id="ai-evaluations" style={{ scrollMarginTop: 88 }}><ReviewsEvaluationsPanel m={m} /></div></div>
            </div>
        </PageShell>
    );
}
