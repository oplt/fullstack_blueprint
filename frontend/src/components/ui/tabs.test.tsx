import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "./tabs";

describe("Tabs orientation", () => {
    it("forwards vertical orientation to Base UI", () => {
        render(
            <Tabs orientation="vertical" defaultValue="one">
                <TabsList>
                    <TabsTrigger value="one">One</TabsTrigger>
                </TabsList>
                <TabsPanel value="one">Content</TabsPanel>
            </Tabs>
        );

        expect(screen.getByRole("tablist").closest('[data-slot="tabs"]')).toHaveAttribute(
            "data-orientation",
            "vertical"
        );
        expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    });
});
