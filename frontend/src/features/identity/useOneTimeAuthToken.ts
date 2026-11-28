import { useLayoutEffect, useState } from "react";
import { parseRequiredParam } from "../../app/searchParams";

function tokenFromUrl(url: URL): string | null {
    const fragmentToken = new URLSearchParams(url.hash.slice(1)).get("token");
    return parseRequiredParam(fragmentToken) ?? parseRequiredParam(url.searchParams.get("token"));
}

export function readOneTimeAuthToken(href: string): string | null {
    return tokenFromUrl(new URL(href));
}

export function sanitizeOneTimeAuthTokenUrl(href: string): string {
    const url = new URL(href);
    const hasFragmentToken = new URLSearchParams(url.hash.slice(1)).has("token");
    if (!hasFragmentToken && !url.searchParams.has("token")) {
        return `${url.pathname}${url.search}${url.hash}`;
    }
    url.hash = "";
    url.searchParams.delete("token");
    return `${url.pathname}${url.search}`;
}

export function useOneTimeAuthToken(): string | null {
    const [token] = useState(() => readOneTimeAuthToken(window.location.href));

    useLayoutEffect(() => {
        const currentUrl = window.location.href;
        const sanitizedUrl = sanitizeOneTimeAuthTokenUrl(currentUrl);
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentPath !== sanitizedUrl) {
            window.history.replaceState(window.history.state, "", sanitizedUrl);
        }
    }, []);

    return token;
}
