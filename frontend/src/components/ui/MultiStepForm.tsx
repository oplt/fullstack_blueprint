import { Button } from "./button";

export function MultiStepForm({ steps, currentStep, onStepChange, onComplete, nextLabel = "Continue", completeLabel = "Finish" }: { steps: Array<{ title: string; content: React.ReactNode }>; currentStep: number; onStepChange: (step: number) => void; onComplete: () => void; nextLabel?: string; completeLabel?: string }) {
    const index = Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0));
    const step = steps[index];
    if (!step) return null;
    return <section aria-label="Form progress" className="space-y-5"><ol className="flex items-center gap-2" aria-label="Steps">{steps.map((item, itemIndex) => <li key={item.title} className="flex min-w-0 items-center gap-2 text-sm"><button type="button" className={itemIndex === index ? "font-semibold text-primary" : itemIndex < index ? "text-foreground" : "text-muted-foreground"} aria-current={itemIndex === index ? "step" : undefined} onClick={() => itemIndex <= index && onStepChange(itemIndex)} disabled={itemIndex > index}>{itemIndex + 1}. {item.title}</button>{itemIndex < steps.length - 1 ? <span className="text-muted-foreground" aria-hidden="true">/</span> : null}</li>)}</ol><div>{step.content}</div><div className="flex justify-between gap-2"><Button type="button" variant="outline" disabled={index === 0} onClick={() => onStepChange(index - 1)}>Back</Button>{index === steps.length - 1 ? <Button type="button" onClick={onComplete}>{completeLabel}</Button> : <Button type="button" onClick={() => onStepChange(index + 1)}>{nextLabel}</Button>}</div></section>;
}

