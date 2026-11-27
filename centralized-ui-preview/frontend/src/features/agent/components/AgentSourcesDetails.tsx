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
                                    <div className="flex gap-ui-sm">
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
                                            <table className="w-full ui-auto-agent-sources-details-table">
                                                <thead>
                                                    <tr className="ui-auto-agent-sources-details-tr">
                                                        <td className="ui-auto-agent-sources-details-td">#</td>
                                                        <td className="ui-auto-agent-sources-details-td-a2ee7af">Chunk ID</td>
                                                        <td className="ui-auto-agent-sources-details-td-a2ee7af-x">Role</td>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedRun.retrieved_chunk_ids.map(
                                                        (chunkId, index) => (
                                                            <tr key={chunkId} className="ui-auto-agent-sources-details-tr-6ff2f8b">
                                                                <td className="ui-auto-agent-sources-details-td-a2ee7af-x-x">{index + 1}</td>
                                                                <td
                                                                    style={{ fontFamily: "monospace" }}
                                                                    className="ui-auto-agent-sources-details-td-a6b6ec8">
                                                                    {chunkId}
                                                                </td>
                                                                <td className="ui-auto-agent-sources-details-td-a2ee7af-x-x-x">
                                                                    Retrieved evidence
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        )}

                                        {selectedRun.injection_chunks_filtered > 0 ? (
                                            <div role="alert" className="ui-auto-agent-sources-details-div">
                                                Filtered {selectedRun.injection_chunks_filtered}{" "}
                                                injection chunk(s) before generation.
                                            </div>
                                        ) : null}

                                        {(selectedRun.retrieval_degraded ||
                                            selectedRun.memory_degraded) && (
                                            <div role="alert" className="ui-auto-agent-sources-details-div-bac2659">
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
