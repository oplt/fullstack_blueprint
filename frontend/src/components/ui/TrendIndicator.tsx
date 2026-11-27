import { ArrowDown, ArrowUp, Minus } from "lucide-react";
export function TrendIndicator({ value, label, positiveIsGood = true }: { value: number; label?: string; positiveIsGood?: boolean }) {
    const tone = value === 0 ? "neutral" : (positiveIsGood ? value > 0 : value < 0) ? "positive" : "negative";
    const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
    return <span data-tone={tone} className="ui-trend"><Icon aria-hidden="true" /><span className="sr-only">{value > 0 ? "Increase " : value < 0 ? "Decrease " : "No change "}</span>{Math.abs(value).toFixed(1)}%{label ? ` ${label}` : ""}</span>;
}
