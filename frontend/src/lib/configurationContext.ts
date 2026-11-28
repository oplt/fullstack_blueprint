import { createContext } from "react";
import { createApplicationConfiguration } from "./configuration";
import type { ApplicationConfiguration } from "./configurationTypes";

const defaultApplicationConfiguration: ApplicationConfiguration = createApplicationConfiguration();

export const ApplicationConfigurationContext = createContext<ApplicationConfiguration>(defaultApplicationConfiguration);
