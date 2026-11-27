import { Button } from "@/components/ui/button";
import { Component, type PropsWithChildren } from "react";

export class RouteErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
    override state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    override render() {
        if (!this.state.failed) return this.props.children;

        return (
            <div className="flex gap-4 items-center p-8" >
                <h4>The application could not load this page</h4>
                <Button onClick={() => window.location.reload()} type="button">Reload page</Button>
            </div>
        );
    }
}
