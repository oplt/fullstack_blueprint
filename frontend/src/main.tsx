import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./index.css";
import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";
import { RouteErrorBoundary } from "./app/RouteErrorBoundary";
import { startWebVitals } from "./performance/webVitals";

if (typeof window !== "undefined") {
    startWebVitals({ sampleRate: import.meta.env.PROD ? 0.1 : 1 });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AppProviders>
            <RouteErrorBoundary><AppRouter /></RouteErrorBoundary>
        </AppProviders>
    </React.StrictMode>
);
