import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { CircleCheck as ReviewIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import type { AiStudioModel } from "../hooks/useAiStudioView";

type Props = { model: AiStudioModel };

export function ReviewQueueSection({ model }: Props) {
    const { reviewsIsError, reviewsError, refetchReviews, reviewsLoading, reviews, reviewNotesById, setReviewNotesById, correctionsById, setCorrectionsById, decideReviewMutation } = model;
    return (
                <div className="flex gap-2.5">
                    <p>Review queue</p>
                    {reviewsIsError && (
                        <QueryErrorAlert
                            error={reviewsError}
                            fallback="Failed to load review queue."
                            onRetry={() => void refetchReviews()}
                        />
                    )}
                    {reviewsLoading ? (
                        <div className="flex gap-2.5">
                            {Array.from({ length: 2 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    style={{ borderRadius: 12 }}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                            <div key={review.id} style={({
                                padding: 16,
                                borderRadius: 16,
                                border: `1px solid ${"var(--border)"}`
                            })}>
                                <div className="flex gap-2">
                                    <div className="flex flex-col sm:flex-row gap-2 justify-between">
                                        <p>Run {review.run_id.slice(0, 8)}</p>
                                        <div
                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                    </div>
                                    <FormField
                                        label="Reviewer notes"
                                        value={reviewNotesById[review.id] ?? ""}
                                        onChange={(event: any) => setReviewNotesById((current) => ({ ...current, [review.id]: event.target.value }))} />
                                    <FormField
                                        label="Corrected output"
                                        value={correctionsById[review.id] ?? ""}
                                        onChange={(event: any) => setCorrectionsById((current) => ({ ...current, [review.id]: event.target.value }))}
                                        as="textarea"
                                        rows={2} />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => decideReviewMutation.mutate({ reviewId: review.id, status: "approved", reviewer_notes: reviewNotesById[review.id], corrected_output: correctionsById[review.id] })}
                                            type="button">
                                            Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => decideReviewMutation.mutate({ reviewId: review.id, status: "changes_requested", reviewer_notes: reviewNotesById[review.id], corrected_output: correctionsById[review.id] })}
                                            type="button">
                                            Request changes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => decideReviewMutation.mutate({ reviewId: review.id, status: "rejected", reviewer_notes: reviewNotesById[review.id] })}
                                            type="button">
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyState icon={<ReviewIcon />} title="No reviews queued" description="Review requests created from runs will appear here." />
                    )}
                </div>
    );
}
