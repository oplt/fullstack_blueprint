import { actionSchema, type GenerativeAction } from "../schemas";

export type ActionContext = { conversationId?: string; componentId?: string };
export type ActionResult = { status: "executed"; value?: unknown } | { status: "denied" | "failed"; reason: string };
export type ActionDispatcher = (action: GenerativeAction, context?: ActionContext) => Promise<ActionResult>;

export function createGenerativeActionDispatcher(options: {
    authorize: (action: GenerativeAction, context: ActionContext) => boolean | Promise<boolean>;
    confirm?: (action: GenerativeAction, context: ActionContext) => boolean | Promise<boolean>;
    execute: (action: GenerativeAction, context: ActionContext) => unknown | Promise<unknown>;
}): ActionDispatcher {
    return async (rawAction, context = {}) => {
        const parsed = actionSchema.safeParse(rawAction);
        if (!parsed.success) return { status: "denied", reason: "Invalid action payload." };
        const action = parsed.data;
        if (!(await options.authorize(action, context))) return { status: "denied", reason: "Action is not authorized." };
        if (action.requiresConfirmation && !(await options.confirm?.(action, context))) return { status: "denied", reason: "Action was not confirmed." };
        try {
            return { status: "executed", value: await options.execute(action, context) };
        } catch {
            return { status: "failed", reason: "Action execution failed." };
        }
    };
}
