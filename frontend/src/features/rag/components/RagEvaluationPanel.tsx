import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
    MessageCircleQuestion,
} from "lucide-react";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";
import { RagEvaluationAnswer } from "./RagEvaluationAnswer";

type RagWorkspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: RagWorkspace };


export function RagEvaluationPanel({ workspace }: Props) {
    return (
                
                    <SectionCard
                        title="Evaluation"
                        description="Grounded ask with citation coverage and retrieval-relevance signals for this response."
                    >
                        <div className="flex gap-ui-sm">
                            <FormField
                                label="Question"
                                value={workspace.askQuery}
                                onChange={(e: any) => workspace.setAskQuery(e.target.value)}
                                as="textarea"
                                rows={2} />
                            <Button
                                variant="default"
                                disabled={!workspace.askQuery.trim() || workspace.askMutation.isPending}
                                onClick={() => workspace.askMutation.mutate()}
                                type="button"><MessageCircleQuestion />Ask (grounded)
                                                            </Button>
                            <RagEvaluationAnswer workspace={workspace} />
                        </div>
                    </SectionCard>
                
    );
}
