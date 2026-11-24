import { type PropsWithChildren } from "react";
import { createApplicationConfiguration } from "./configuration";
import type { ApplicationConfiguration, ApplicationConfigurationInput } from "./types";
import { ApplicationConfigurationContext } from "./configurationContext";

export function ApplicationConfigurationProvider({ children, configuration }: PropsWithChildren<{ configuration?: ApplicationConfiguration | ApplicationConfigurationInput }>) {
    const resolved = configuration && "build" in configuration && "deployment" in configuration
        ? configuration as ApplicationConfiguration
        : createApplicationConfiguration(configuration);
    return <ApplicationConfigurationContext.Provider value={resolved}>{children}</ApplicationConfigurationContext.Provider>;
}
