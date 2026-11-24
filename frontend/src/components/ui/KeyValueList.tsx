import { helpTermIdForKey } from "../../config/helpText";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { HelpTooltip } from "./HelpTooltip";

export type KeyValueItem = {
    key: string;
    label: React.ReactNode;
    value: React.ReactNode;
    /** Optional hint under the value. */
    description?: React.ReactNode;
    /** Optional explicit help term; otherwise inferred from `key`. */
    helpTermId?: string;
};

type KeyValueListProps = {
    items: KeyValueItem[];
    /** denser rows for metrics panels */
    dense?: boolean;
    emptyLabel?: string;
    /** Attach help icons when a term is known for the item key. */
    showHelp?: boolean;
    sx?: SxProps<Theme>;
};

/**
 * Structured label/value list for metrics and provenance instead of raw JSON.
 */
export function KeyValueList({
    items,
    dense = false,
    emptyLabel = "No metrics available.",
    showHelp = true,
    sx,
}: KeyValueListProps) {
    if (items.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={sx}>
                {emptyLabel}
            </Typography>
        );
    }

    return (
        <Box
            component="dl"
            sx={[
                {
                    m: 0,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "minmax(120px, 40%) minmax(0, 1fr)",
                    },
                    columnGap: 2,
                    rowGap: dense ? 0.75 : 1.25,
                },
                ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ]}
        >
            {items.map((item) => {
                const termId = item.helpTermId ?? (showHelp ? helpTermIdForKey(item.key) : null);
                return (
                    <Box key={item.key} sx={{ display: "contents" }}>
                        <Typography
                            component="dt"
                            variant={dense ? "caption" : "body2"}
                            color="text.secondary"
                            sx={{
                                textTransform: "capitalize",
                                pr: { sm: 1 },
                                borderBottom: { sm: 1 },
                                borderColor: "divider",
                                py: dense ? 0.5 : 0.75,
                            }}
                        >
                            {termId ? (
                                <HelpTooltip termId={termId} variant="label">
                                    {item.label}
                                </HelpTooltip>
                            ) : (
                                item.label
                            )}
                        </Typography>
                        <Box
                            component="dd"
                            sx={{
                                m: 0,
                                borderBottom: 1,
                                borderColor: "divider",
                                py: dense ? 0.5 : 0.75,
                                minWidth: 0,
                            }}
                        >
                            <Typography
                                variant={dense ? "body2" : "subtitle2"}
                                sx={{ fontVariantNumeric: "tabular-nums", wordBreak: "break-word" }}
                            >
                                {item.value}
                            </Typography>
                            {item.description ? (
                                <Typography variant="caption" color="text.secondary">
                                    {item.description}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}
