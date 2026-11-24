import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./index.css";
import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";
import { RouteErrorBoundary } from "./app/RouteErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AppProviders>
            <RouteErrorBoundary><AppRouter /></RouteErrorBoundary>
        </AppProviders>
    </React.StrictMode>
);
