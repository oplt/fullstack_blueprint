import { MultiStepForm } from "./MultiStepForm";

export function OnboardingSteps({ steps, currentStep, onStepChange, onComplete }: { steps: Array<{ title: string; content: React.ReactNode }>; currentStep: number; onStepChange: (step: number) => void; onComplete: () => void }) {
    return <MultiStepForm steps={steps} currentStep={currentStep} onStepChange={onStepChange} onComplete={onComplete} completeLabel="Get started" />;
}

