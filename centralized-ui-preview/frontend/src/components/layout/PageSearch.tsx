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
        <div role="search" className="relative w-full min-w-0 ui-auto-page-search-div">
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
                        className="pointer-events-none absolute shrink-0 ui-auto-page-search-search"
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
                        className={`w-full min-w-0 rounded-sm bg-card pl-9 text-base md:text-sm ${query ? "pr-12" : "pr-3 xl:pr-20"}`}
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
                            className="absolute ui-auto-page-search-button"
                        >
                            <X className="ui-auto-page-search-x" aria-hidden="true" />
                        </Button>
                    ) : (
                        <kbd
                            aria-hidden="true"
                            className="pointer-events-none absolute hidden xl:inline-block ui-auto-page-search-kbd"
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
                                    <Icon className="shrink-0 ui-auto-page-search-icon" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{page.label}</span>
                                    {page.path === highlightedPath ? (
                                        <CornerDownLeft className="shrink-0 ui-auto-page-search-corner-down-left" aria-hidden="true" />
                                    ) : null}
                                </ComboboxItem>
                            );
                        }}
                    </ComboboxList>
                    <ComboboxEmpty role="status">{t("navigation.noMatchingPages")}</ComboboxEmpty>
                    {results.length > 0 ? (
                        <div
                            aria-hidden="true"
                            className="flex flex-wrap items-center ui-auto-page-search-div-5c79c90"
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
