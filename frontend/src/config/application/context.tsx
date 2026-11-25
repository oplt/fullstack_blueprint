
import { type PropsWithChildren } from "react";

import {
    createApplicationConfiguration,
} from "./configuration";

import type {
    ApplicationConfigurationInput,
} from "./types";

import {
    ApplicationConfigurationContext,
} from "./configurationContext";

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
