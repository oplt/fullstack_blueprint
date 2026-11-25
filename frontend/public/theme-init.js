// Runs synchronously before stylesheets and the application bundle.
(() => {
    let preference;
    try {
        preference = JSON.parse(localStorage.getItem("fullstack-blueprint.theme"))?.colorMode;
    } catch { /* Storage can be blocked or contain an obsolete value. */ }

    const dark = preference === "dark" ||
        (preference !== "light" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.classList.toggle("dark", Boolean(dark));
})();
