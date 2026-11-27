import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register names, not values: index.css remains the only token-value source.
// Without this, custom text-* size roles can be mistaken for text colors.
const merge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: [
                "display-xl", "display-lg", "display-md", "display-sm",
                "page-title", "body-lg", "body-md", "body-sm", "label-sm",
                "button-lg", "button-md", "mono-eyebrow", "code",
                "title-lg", "title-md", "title-sm", "caption",
            ] }],
        },
        theme: {
            spacing: ["ui-xxs", "ui-xs", "ui-sm", "ui-md", "ui-lg", "ui-xl", "ui-xxl", "ui-3xl", "ui-4xl", "ui-section"],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return merge(clsx(inputs));
}
