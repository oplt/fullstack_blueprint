import { useContext } from "react";
import { ApplicationConfigurationContext } from "./configurationContext";
import type { ApplicationConfiguration } from "./types";

export function useApplicationConfiguration(): ApplicationConfiguration {
    return useContext(ApplicationConfigurationContext);
}
