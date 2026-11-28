import type { ReactNode } from "react";
type AuthShellProps = { sideContent: ReactNode; children: ReactNode };
export function AuthShell({ sideContent, children }: AuthShellProps) {
    return <main className="ui-auth-shell">
        <div className="ui-auth-grid">
            <section className="ui-auth-aside">{sideContent}</section>
            <section className="ui-auth-form"><div className="ui-auth-form-content">{children}</div></section>
        </div>
    </main>;
}
