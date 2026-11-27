import { useSyncExternalStore } from "react";
// CSS owns the breakpoint. The fallback is only used before styles are available;
// design:check verifies it matches the CSS value.
const FALLBACK_BREAKPOINT = "48rem";
function mediaQuery() {
    const breakpoint = getComputedStyle(document.documentElement).getPropertyValue("--navigation-breakpoint").trim() || FALLBACK_BREAKPOINT;
    return window.matchMedia?.(`(width < ${breakpoint})`);
}
function subscribe(onChange: () => void) {
    const media = mediaQuery();
    media?.addEventListener("change", onChange);
    return () => media?.removeEventListener("change", onChange);
}
function snapshot() { return mediaQuery()?.matches ?? false; }
export function useIsMobile() { return useSyncExternalStore(subscribe, snapshot, () => false); }
