import { componentSchema, generativePayloadSchema, type GenerativeComponent, type GenerativePayload } from "./schemas";

const GENERATIVE_UI_LIMITS = { maxBytes: 200_000, maxDepth: 4, maxNodes: 120, maxChildren: 20 } as const;

export type GenerativeValidationResult = { success: true; data: GenerativePayload } | { success: false; error: string };

function parseComponent(input: unknown, depth: number, count: { value: number }): GenerativeComponent {
    if (depth > GENERATIVE_UI_LIMITS.maxDepth) throw new Error("Generative UI nesting limit exceeded.");
    count.value += 1;
    if (count.value > GENERATIVE_UI_LIMITS.maxNodes) throw new Error("Generative UI node limit exceeded.");
    const parsed = componentSchema.safeParse(input);
    if (!parsed.success) throw new Error("Unsupported or invalid generative UI component.");
    const component = parsed.data as GenerativeComponent & { children?: unknown[] };
    if (component.children) {
        if (component.children.length > GENERATIVE_UI_LIMITS.maxChildren) throw new Error("Generative UI child limit exceeded.");
        component.children = component.children.map((child) => parseComponent(child, depth + 1, count));
    }
    if (component.type === "structured_report") {
        component.sections = component.sections.map((section) => ({
            ...section,
            components: section.components?.map((child) => parseComponent(child, depth + 1, count)),
        }));
    }
    return component;
}

export function validateGenerativePayload(input: unknown): GenerativeValidationResult {
    try {
        const bytes = JSON.stringify(input).length;
        if (bytes > GENERATIVE_UI_LIMITS.maxBytes) return { success: false, error: "Generative UI payload is too large." };
        const root = generativePayloadSchema.safeParse(input);
        if (!root.success) return { success: false, error: "Generative UI payload has an invalid shape." };
        const count = { value: 0 };
        const components = root.data.components.map((component) => parseComponent(component, 0, count));
        return { success: true, data: { version: 1, components } };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Generative UI payload was rejected." };
    }
}
