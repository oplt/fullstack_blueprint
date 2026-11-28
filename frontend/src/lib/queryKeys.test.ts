import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { clearUserSessionCache, queryKeys, resetUserSessionCache } from "./queryKeys";

describe("user session query isolation", () => {
    it("clears user-scoped records before a new identity is published", async () => {
        const client = new QueryClient();
        client.setQueryData(queryKeys.projects.all, [{ id: "old-user-project" }]);
        client.setQueryData(queryKeys.users.profile, { user_id: "old-user" });

        await clearUserSessionCache(client);

        expect(client.getQueryData(queryKeys.projects.all)).toBeUndefined();
        expect(client.getQueryData(queryKeys.users.profile)).toBeUndefined();
        client.clear();
    });

    it.each([
        ["logout", clearUserSessionCache],
        ["sign-in", resetUserSessionCache],
    ] as const)("preserves only the public metadata query on %s", async (_transition, reset) => {
        const client = new QueryClient();
        const metadata = { app_name: "Fullstack Blueprint" };
        const scopedMetadataKey = [...queryKeys.platform.metadata, "user-1"];
        client.setQueryData(queryKeys.platform.metadata, metadata);
        client.setQueryData(scopedMetadataKey, { permissions: ["private"] });
        client.setQueryData(queryKeys.projects.all, [{ id: "private-project" }]);
        client.setQueryData(queryKeys.platform.subscription, { plan: "private-plan" });
        client.getMutationCache().build(client, { mutationKey: ["private-mutation"] });

        await reset(client);

        expect(client.getQueryData(queryKeys.platform.metadata)).toEqual(metadata);
        expect(client.getQueryData(scopedMetadataKey)).toBeUndefined();
        expect(client.getQueryData(queryKeys.projects.all)).toBeUndefined();
        expect(client.getQueryData(queryKeys.platform.subscription)).toBeUndefined();
        expect(client.getMutationCache().getAll()).toHaveLength(0);
        client.clear();
    });
});
