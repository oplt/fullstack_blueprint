import { type PropsWithChildren } from "react";

import {
    ApplicationConfigurationContext,
    createApplicationConfiguration,
} from "./configuration";

import type {
    ApplicationConfigurationInput,
} from "./configuration";

export function ApplicationConfigurationProvider({
    children,
    configuration,
}: PropsWithChildren<{
    configuration?: ApplicationConfigurationInput;
}>) {
    return (
        <ApplicationConfigurationContext.Provider
            value={createApplicationConfiguration(
                configuration,
            )}
        >
            {children}
        </ApplicationConfigurationContext.Provider>
    );
}
