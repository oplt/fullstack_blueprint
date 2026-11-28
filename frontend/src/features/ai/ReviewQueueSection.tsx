import {Button} from "@/components/ui/button";
import {FormField} from "@/components/ui/form-field";
import {CircleCheck} from "lucide-react";
import {EmptyState} from "../../components/ui/EmptyState";
import {QueryErrorAlert} from "../../components/ui/QueryBoundary";
import type {AiStudioModel} from "./useAiStudioView";
import {Badge} from "@/components/ui/badge";

type Props = { model: AiStudioModel };

export function ReviewQueueSection({model}: Props) {
    const {
        reviewsIsError,
        reviewsError,
        refetchReviews,
        reviewsLoading,
        reviews,
        reviewNotesById,
        setReviewNotesById,
        correctionsById,
        setCorrectionsById,
        decideReviewMutation
    } = model;
    return (
        <div className="flex gap-ui-sm">
            <p>Review queue</p>
            {reviewsIsError && (
                <QueryErrorAlert
                    error={reviewsError}
                    fallback="Failed to load review queue."
                    onRetry={() => void refetchReviews()}
                />
            )}
            {reviewsLoading ? (
                <div className="flex gap-ui-sm">
                    {Array.from({length: 2}).map((_: any, index: any) => (
                        <div
                            key={index}
                            className="animate-pulse rounded-md bg-muted"/>
                    ))}
                </div>
            ) : reviews.length > 0 ? (
                reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-border p-ui-md">
                        <div className="flex gap-ui-xs">
                            <div className="flex flex-col sm:flex-row gap-ui-xs justify-between">
                                <p>Run {review.run_id.slice(0, 8)}</p>
                                <Badge variant="outline">
                                    {review.status}
                                </Badge>
                            </div>
                            <FormField
                                label="Reviewer notes"
                                value={reviewNotesById[review.id] ?? ""}
                                onChange={(event: any) => setReviewNotesById((current) => ({
                                    ...current,
                                    [review.id]: event.target.value
                                }))}/>
                            <FormField
                                label="Corrected output"
                                value={correctionsById[review.id] ?? ""}
                                onChange={(event: any) => setCorrectionsById((current) => ({
                                    ...current,
                                    [review.id]: event.target.value
                                }))}
                                as="textarea"
                                rows={2}/>
                            <div className="flex flex-col sm:flex-row gap-ui-xs">
                                <Button
                                    variant="outline"
                                    onClick={() => decideReviewMutation.mutate({
                                        reviewId: review.id,
                                        status: "approved",
                                        reviewer_notes: reviewNotesById[review.id],
                                        corrected_output: correctionsById[review.id]
                                    })}
                                    type="button">
                                    Approve
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => decideReviewMutation.mutate({
                                        reviewId: review.id,
                                        status: "changes_requested",
                                        reviewer_notes: reviewNotesById[review.id],
                                        corrected_output: correctionsById[review.id]
                                    })}
                                    type="button">
                                    Request changes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => decideReviewMutation.mutate({
                                        reviewId: review.id,
                                        status: "rejected",
                                        reviewer_notes: reviewNotesById[review.id]
                                    })}
                                    type="button">
                                    Reject
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <EmptyState icon={<CircleCheck/>} title="No reviews queued"
                            description="Review requests created from runs will appear here."/>
            )}
        </div>
    );
}
