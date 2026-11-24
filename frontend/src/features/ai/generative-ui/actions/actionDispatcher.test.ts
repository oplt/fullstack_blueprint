import { describe, expect, it, vi } from "vitest";
import { createGenerativeActionDispatcher } from "./actionDispatcher";

const action = { actionId: "approve-1", label: "Approve", kind: "approve" as const, payload: {}, requiresConfirmation: true };

describe("generative action dispatcher", () => {
    it("requires authorization and explicit confirmation before execution", async () => {
        const execute = vi.fn();
        const dispatch = createGenerativeActionDispatcher({ authorize: () => true, confirm: () => false, execute });
        expect(await dispatch(action)).toMatchObject({ status: "denied" });
        expect(execute).not.toHaveBeenCalled();
    });

    it("executes only an authorized, confirmed action", async () => {
        const execute = vi.fn().mockResolvedValue("ok");
        const dispatch = createGenerativeActionDispatcher({ authorize: () => true, confirm: () => true, execute });
        expect(await dispatch(action)).toMatchObject({ status: "executed", value: "ok" });
        expect(execute).toHaveBeenCalledOnce();
    });
});
