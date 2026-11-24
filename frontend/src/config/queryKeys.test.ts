import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { clearUserSessionCache, queryKeys } from "./queryKeys";

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
});
