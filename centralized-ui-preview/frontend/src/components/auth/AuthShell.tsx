
import type { ReactNode } from "react";

type AuthShellProps = {
    sideContent: ReactNode;
    children: ReactNode;
};

export function AuthShell({
    sideContent,
    children,
}: AuthShellProps) {
    return (
        <main className="flex w-full items-center justify-center ui-auto-auth-shell-main">
            <div className="grid w-full items-stretch ui-auto-auth-shell-div">

                <section className="hidden min-w-0 overflow-hidden lg:block ui-auto-auth-shell-section">
                    {sideContent}
                </section>

                <section className="flex min-w-0 items-center justify-center ui-auto-auth-shell-section-569894a">
                    <div className="w-full min-w-0 ui-auto-auth-shell-div-901e050">
                        {children}
                    </div>
                </section>

            </div>
        </main>
    );
}
