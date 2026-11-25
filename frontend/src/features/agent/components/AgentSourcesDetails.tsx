import { SectionCard } from "../../../components/ui/SectionCard";
import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";
type Workspace = ReturnType<typeof useAgentWorkspace>;
type AgentRun = NonNullable<Workspace["selectedRunQuery"]["data"]>;

type Props = { run: AgentRun };
export function AgentSourcesDetails({ run: selectedRun }: Props) {
    return (
                            
                                <SectionCard
                                    title="Sources"
                                    description="Citations and retrieved evidence attached to this run."
                                >
                                    <div className="flex gap-3">
                                        {selectedRun.retrieval_query ? (
                                            <p className="text-muted-foreground">
                                                Retrieval query: {selectedRun.retrieval_query}
                                            </p>
                                        ) : null}

                                        {selectedRun.retrieved_chunk_ids.length === 0 ? (
                                            <p className="text-muted-foreground">
                                                No retrieved evidence for this run.
                                            </p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <td className="p-2 align-top">#</td>
                                                        <td className="p-2 align-top">Chunk ID</td>
                                                        <td className="p-2 align-top">Role</td>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedRun.retrieved_chunk_ids.map(
                                                        (chunkId, index) => (
                                                            <tr key={chunkId} className="border-b border-border">
                                                                <td className="p-2 align-top">{index + 1}</td>
                                                                <td
                                                                    style={{
                                                                        fontFamily: "monospace",
                                                                        fontSize: 12,
                                                                    }}
                                                                    className="p-2 align-top">
                                                                    {chunkId}
                                                                </td>
                                                                <td className="p-2 align-top">
                                                                    Retrieved evidence
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        )}

                                        {selectedRun.injection_chunks_filtered > 0 ? (
                                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                                Filtered {selectedRun.injection_chunks_filtered}{" "}
                                                injection chunk(s) before generation.
                                            </div>
                                        ) : null}

                                        {(selectedRun.retrieval_degraded ||
                                            selectedRun.memory_degraded) && (
                                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                                {selectedRun.degradation_reason ??
                                                    (selectedRun.retrieval_degraded
                                                        ? "Retrieval degraded — treat sources cautiously."
                                                        : "Memory degraded.")}
                                            </div>
                                        )}
                                    </div>
                                </SectionCard>
                            
    );
}
