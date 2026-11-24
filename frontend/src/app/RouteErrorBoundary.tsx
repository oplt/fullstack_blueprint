import { Component, type PropsWithChildren } from "react";
import { Button, Stack, Typography } from "@/components/ui/muiCompat";

export class RouteErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
                <Typography variant="h4" component="h1">The application could not load this page</Typography>
                <Button onClick={() => window.location.reload()}>Reload page</Button>
            </Stack>
        );
    }
}
