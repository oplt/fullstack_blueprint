import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { usePlatformMetadata } from "./hooks";

afterEach(() => vi.unstubAllGlobals());

it("reuses pending public metadata when consumers remount", async () => {
    const client = new QueryClient();
    const metadata = { app_name: "Fullstack Blueprint" };
    let finishRequest = () => {};
    const pending = new Promise<void>(resolve => { finishRequest = resolve; });
    const fetchMock = vi.fn(async () => {
        await pending;
        return new Response(JSON.stringify(metadata), {
            headers: { "Content-Type": "application/json" },
        });
    });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(usePlatformMetadata, { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    first.unmount();

    const second = renderHook(usePlatformMetadata, { wrapper });
    finishRequest();

    await waitFor(() => expect(second.result.current.data).toEqual(metadata));
    expect(fetchMock).toHaveBeenCalledOnce();
});
