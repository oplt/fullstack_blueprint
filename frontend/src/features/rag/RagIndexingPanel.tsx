import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { SectionCard } from "../../components/ui/SectionCard";
import type { useRagWorkspace } from "./useRagWorkspace";
import { RagIndexingConfiguration } from "./RagIndexingConfiguration";
import { RagChunksPanel } from "./RagChunksPanel";

type RagWorkspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: RagWorkspace; onTabChange: (tab: "documents" | "indexing" | "retrieval" | "evaluation" | "runs") => void };

export function RagIndexingPanel({ workspace, onTabChange }: Props) {
    const selectedDocument = workspace.selectedDocument;
    return (
                
                    <>
                        {!selectedDocument ? (
                            <SectionCard
                                title="Indexing"
                                description="Select a document to inspect embedding/chunk settings, progress, and chunks."
                            >
                                <EmptyState
                                    icon={<RefreshCw />}
                                    title="No document selected"
                                    description="Choose a document from Documents, then return here to browse chunks and indexing progress."
                                    action={
                                        <Button variant="default" onClick={() => onTabChange("documents")} type="button">
                                            Open Documents
                                        </Button>
                                    }
                                />
                            </SectionCard>
                        ) : (
                            <>
                                <RagIndexingConfiguration workspace={workspace} document={selectedDocument} />
                                <RagChunksPanel workspace={workspace} />
                            </>
                        )}
                    </>
                
    );
}
