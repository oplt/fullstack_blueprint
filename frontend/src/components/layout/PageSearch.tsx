import { useEffect, useRef, useState } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

type Page = { label: string; path: string; icon: LucideIcon };

function searchShortcut(event: KeyboardEvent) {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey) return false;
    if (event.target instanceof Element && event.target.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]",
    )) return false;
    if (event.ctrlKey || event.metaKey) return event.key.toLowerCase() === "k";
    return event.key === "/";
}

export function PageSearch({ pages }: { pages: Page[] }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const returnFocus = useRef<HTMLElement | null>(null);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleShortcut(event: KeyboardEvent) {
            if (!searchShortcut(event)) return;
            event.preventDefault();
            if (!open && document.activeElement instanceof HTMLElement) {
                returnFocus.current = document.activeElement;
            }
            setOpen(!open);
        }
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [open]);

    const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
    return <>
        <button type="button" aria-label={t("navigation.searchPages")}
            onClick={event => { returnFocus.current = event.currentTarget; setOpen(true); }}
            className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted sm:border sm:px-3">
            <Search aria-hidden size={16} />
            <span className="hidden sm:inline">{t("actions.search")}</span>
            <kbd className="hidden rounded bg-muted px-1.5 text-xs sm:inline">{mac ? "⌘K" : "Ctrl+K"}</kbd>
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent initialFocus={input} finalFocus={returnFocus}>
                <DialogTitle>{t("navigation.searchPages")}</DialogTitle>
                {open && <Results pages={pages} input={input} onSelect={path => { setOpen(false); navigate(path); }} />}
            </DialogContent>
        </Dialog>
    </>;
}

function Results({ pages, input, onSelect }: {
    pages: Page[];
    input: React.RefObject<HTMLInputElement | null>;
    onSelect: (path: string) => void;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const results = pages.filter(page => page.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" && event.target === input.current && results.length) {
            event.preventDefault();
            onSelect(results[0].path);
            return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
        if (!buttons.length) return;
        event.preventDefault();
        const index = buttons.findIndex(button => button === event.target);
        const next = event.key === "ArrowDown" ? index + 1 : (index < 0 ? 0 : index) - 1;
        buttons[(next + buttons.length) % buttons.length].focus();
    }
    return <div onKeyDown={moveFocus}>
        <input ref={input} value={query} onChange={event => setQuery(event.target.value)}
            aria-label={t("navigation.searchPages")} placeholder={t("navigation.searchPagesHint")}
            className="w-full rounded-md border bg-background p-2" />
        <div className="max-h-72 overflow-auto py-2">
            {results.map(page => <button type="button" key={page.path} onClick={() => onSelect(page.path)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted">
                <page.icon aria-hidden size={17} />{page.label}
            </button>)}
            {!results.length && <p role="status" className="p-4 text-muted-foreground">{t("navigation.noMatchingPages")}</p>}
        </div>
    </div>;
}
