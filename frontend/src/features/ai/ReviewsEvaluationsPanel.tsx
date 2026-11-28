import { SectionCard } from "../../components/ui/SectionCard";
import type { AiStudioModel } from "./useAiStudioView";
import { ReviewQueueSection } from "./ReviewQueueSection";
import { EvaluationDatasetBuilder } from "./EvaluationDatasetBuilder";
import { EvaluationResults } from "./EvaluationResults";


export function ReviewsEvaluationsPanel({ m }: { m: AiStudioModel }) {
    return (
        <SectionCard title="Reviews and evaluations" description="Route sensitive outputs through human approval and keep reusable benchmark datasets for prompt regression testing.">
            <div className="flex gap-ui-md">
                <ReviewQueueSection model={m} />
                <div className="flex gap-ui-sm">
                    <EvaluationDatasetBuilder model={m} />
                    <EvaluationResults model={m} />
                </div>

            </div>
        </SectionCard>
    );
}
