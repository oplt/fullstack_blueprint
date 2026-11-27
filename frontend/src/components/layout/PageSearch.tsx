import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CornerDownLeft, Search, X, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxInputGroup,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";

type Page = {
    label: string;
    path: string;
    icon: LucideIcon;
};

type PageSearchProps = {
    pages: Page[];
};

function isSearchShortcut(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey) {
        return false;
    }

    if (
        event.target instanceof Element &&
        event.target.closest(
            "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]",
        )
    ) {
        return false;
    }

    if (event.ctrlKey || event.metaKey) return event.key.toLowerCase() === "k";
    return event.key === "/";
}

export function PageSearch({ pages }: PageSearchProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedPath, setHighlightedPath] = useState<string>();

    const normalizedQuery = query.trim().toLocaleLowerCase();
    const results = normalizedQuery
        ? pages.filter((page) => page.label.toLocaleLowerCase().includes(normalizedQuery))
        : [];
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

    useEffect(() => {
        function handleShortcut(event: KeyboardEvent) {
            if (!isSearchShortcut(event)) return;
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
        }

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    function clearSearch() {
        setQuery("");
        setIsOpen(false);
        setHighlightedPath(undefined);
    }

    function selectPage(path: string) {
        clearSearch();
        inputRef.current?.blur();
        if (path !== location.pathname) navigate(path);
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.nativeEvent.isComposing || event.key !== "Escape") return;
        event.preventDefault();
        clearSearch();
        inputRef.current?.blur();
    }

    return (
        <div role="search" className="relative w-full min-w-0 max-w-[360px] sm:w-[240px] lg:w-[300px] xl:w-[360px]">
            <Combobox<Page>
                items={results}
                filter={null}
                value={null}
                inputValue={query}
                open={isOpen}
                onInputValueChange={(value) => {
                    setQuery(value);
                    setIsOpen(value.trim().length > 0);
                }}
                onOpenChange={setIsOpen}
                onValueChange={(page) => {
                    if (page) selectPage(page.path);
                }}
                onItemHighlighted={(page) => setHighlightedPath(page?.path)}
                itemToStringLabel={(page) => page.label}
                itemToStringValue={(page) => page.path}
                autoComplete="off"
                autoHighlight
            >
                <ComboboxInputGroup>
                    <Search
                        className="pointer-events-none absolute left-3 size-(--icon-size-md) shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <ComboboxInput
                        ref={inputRef}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t("actions.search")}
                        aria-label={t("navigation.searchPages")}
                        onFocus={() => {
                            if (query.trim()) setIsOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full min-w-0 rounded-sm bg-card pl-9 text-body-lg md:text-body-md ${query ? "pr-12" : "pr-ui-sm xl:pr-20"}`}
                    />
                    {query ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Clear search"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                clearSearch();
                                inputRef.current?.focus();
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                            <X className="size-(--icon-size-md)" aria-hidden="true" />
                        </Button>
                    ) : (
                        <kbd
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3 hidden select-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-body-sm text-muted-foreground xl:inline-block"
                        >
                            {isMac ? "⌘K" : "Ctrl+K"}
                        </kbd>
                    )}
                </ComboboxInputGroup>
                <ComboboxContent>
                    <ComboboxList aria-label={t("navigation.searchPages")}>
                        {(page: Page) => {
                            const Icon = page.icon;
                            return (
                                <ComboboxItem key={page.path} value={page}>
                                    <Icon className="size-(--icon-size-md) shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{page.label}</span>
                                    {page.path === highlightedPath ? (
                                        <CornerDownLeft className="size-(--icon-size-compact) shrink-0 text-muted-foreground" aria-hidden="true" />
                                    ) : null}
                                </ComboboxItem>
                            );
                        }}
                    </ComboboxList>
                    <ComboboxEmpty role="status">{t("navigation.noMatchingPages")}</ComboboxEmpty>
                    {results.length > 0 ? (
                        <div
                            aria-hidden="true"
                            className="flex flex-wrap items-center gap-x-ui-sm gap-y-ui-xxs border-t border-border px-ui-sm py-ui-xs text-body-sm text-muted-foreground"
                        >
                            <span>↑ ↓ Navigate</span>
                            <span>↵ Select</span>
                            <span>Esc Close</span>
                        </div>
                    ) : null}
                </ComboboxContent>
            </Combobox>
        </div>
    );
}
