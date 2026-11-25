
import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
    Search,
    X,
    CornerDownLeft,
    type LucideIcon,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Page = {
    label: string;
    path: string;
    icon: LucideIcon;
};

type PageSearchProps = {
    pages: Page[];
};

function isSearchShortcut(event: KeyboardEvent): boolean {
    if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey
    ) {
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

    if (event.ctrlKey || event.metaKey) {
        return event.key.toLowerCase() === "k";
    }

    return event.key === "/";
}

export function PageSearch({ pages }: PageSearchProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);

    const resultsId = useId();

    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const normalizedQuery = query.trim().toLocaleLowerCase();

    const results = normalizedQuery
        ? pages.filter((page) =>
              page.label
                  .toLocaleLowerCase()
                  .includes(normalizedQuery),
          )
        : [];

    const showResults =
        isFocused && normalizedQuery.length > 0;

    const selectedIndex = Math.min(
        activeIndex,
        results.length - 1,
    );

    const activeResult =
        selectedIndex >= 0
            ? results[selectedIndex]
            : undefined;

    const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.platform);

    useEffect(() => {
        function handleShortcut(event: KeyboardEvent) {
            if (!isSearchShortcut(event)) {
                return;
            }

            event.preventDefault();

            inputRef.current?.focus();
            inputRef.current?.select();
        }

        window.addEventListener("keydown", handleShortcut);

        return () => {
            window.removeEventListener(
                "keydown",
                handleShortcut,
            );
        };
    }, []);

    useEffect(() => {
        function handleOutsideClick(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                !containerRef.current?.contains(event.target)
            ) {
                setIsFocused(false);
            }
        }

        document.addEventListener(
            "pointerdown",
            handleOutsideClick,
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handleOutsideClick,
            );
        };
    }, []);

    useEffect(() => {
        if (!showResults || selectedIndex < 0) {
            return;
        }

        const activeElement =
            resultsRef.current?.children[selectedIndex];

        activeElement?.scrollIntoView?.({
            block: "nearest",
        });
    }, [selectedIndex, showResults]);

    function clearSearch() {
        setQuery("");
        setActiveIndex(0);
    }

    function selectPage(path: string) {
        clearSearch();
        setIsFocused(false);

        inputRef.current?.blur();

        if (path !== location.pathname) {
            navigate(path);
        }
    }

    function handleKeyDown(
        event: ReactKeyboardEvent<HTMLInputElement>,
    ) {
        if (event.nativeEvent.isComposing) {
            return;
        }

        switch (event.key) {
            case "ArrowDown": {
                if (!results.length) {
                    return;
                }

                event.preventDefault();
                setIsFocused(true);

                setActiveIndex(
                    (selectedIndex + 1) % results.length,
                );

                break;
            }

            case "ArrowUp": {
                if (!results.length) {
                    return;
                }

                event.preventDefault();
                setIsFocused(true);

                setActiveIndex(
                    (selectedIndex - 1 + results.length) %
                        results.length,
                );

                break;
            }

            case "Enter": {
                if (!showResults || !activeResult) {
                    return;
                }

                event.preventDefault();
                selectPage(activeResult.path);

                break;
            }

            case "Escape": {
                event.preventDefault();

                clearSearch();
                setIsFocused(false);
                inputRef.current?.blur();

                break;
            }

            case "Tab": {
                setIsFocused(false);
                break;
            }

            default:
                break;
        }
    }

    return (
        <div
            ref={containerRef}
            role="search"
            className="relative w-full min-w-0 max-w-[360px] sm:w-[240px] lg:w-[300px] xl:w-[360px]"
            onBlur={(event) => {
                if (
                    !event.currentTarget.contains(
                        event.relatedTarget,
                    )
                ) {
                    setIsFocused(false);
                }
            }}
        >
            <div className="relative flex w-full items-center">
                <Search
                    className="pointer-events-none absolute left-3 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                />

                <Input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    placeholder={t("actions.search")}
                    aria-label={t("navigation.searchPages")}
                    aria-autocomplete="list"
                    aria-expanded={showResults}
                    aria-controls={
                        showResults ? resultsId : undefined
                    }
                    aria-activedescendant={
                        showResults && activeResult
                            ? `${resultsId}-${selectedIndex}`
                            : undefined
                    }
                    onFocus={() => setIsFocused(true)}
                    onChange={(event) => {
                        setQuery(event.currentTarget.value);
                        setActiveIndex(0);
                        setIsFocused(true);
                    }}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "h-10 w-full min-w-0 rounded-lg bg-background pl-9 text-sm",
                        query ? "pr-9" : "pr-3 xl:pr-20",
                    )}
                />

                {query ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clear search"
                        onMouseDown={(event) =>
                            event.preventDefault()
                        }
                        onClick={() => {
                            clearSearch();
                            inputRef.current?.focus();
                        }}
                        className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
                    >
                        <X
                            className="size-4"
                            aria-hidden="true"
                        />
                    </Button>
                ) : (
                    <kbd
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 hidden select-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground xl:inline-block"
                    >
                        {isMac ? "⌘K" : "Ctrl+K"}
                    </kbd>
                )}
            </div>

            {showResults && (
                <div className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-overlay">
                    <ul
                        ref={resultsRef}
                        id={resultsId}
                        role="listbox"
                        aria-label={t("navigation.searchPages")}
                        className="max-h-[320px] overflow-y-auto p-1"
                    >
                        {results.map((page, index) => (
                            <li
                                key={page.path}
                                id={`${resultsId}-${index}`}
                                role="option"
                                aria-selected={
                                    index === selectedIndex
                                }
                                onMouseDown={(event) =>
                                    event.preventDefault()
                                }
                                onMouseEnter={() =>
                                    setActiveIndex(index)
                                }
                                onClick={() =>
                                    selectPage(page.path)
                                }
                                className={cn(
                                    "flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                                    index === selectedIndex
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-muted",
                                )}
                            >
                                <page.icon
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <span className="min-w-0 flex-1 truncate">
                                    {page.label}
                                </span>

                                {index === selectedIndex && (
                                    <CornerDownLeft
                                        className="size-3.5 shrink-0 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                )}
                            </li>
                        ))}
                    </ul>

                    {results.length === 0 && (
                        <p
                            role="status"
                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                        >
                            {t("navigation.noMatchingPages")}
                        </p>
                    )}

                    {results.length > 0 && (
                        <div
                            aria-hidden="true"
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted-foreground"
                        >
                            <span>↑ ↓ Navigate</span>
                            <span>↵ Select</span>
                            <span>Esc Close</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
