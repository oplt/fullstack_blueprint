import { useContext } from "react";
import { ApplicationConfigurationContext } from "./configurationContext";
import type { ApplicationConfiguration } from "./configurationTypes";

export function useApplicationConfiguration(): ApplicationConfiguration {
    return useContext(ApplicationConfigurationContext);
}
