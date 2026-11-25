
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
        <main className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-stretch gap-6 lg:grid-cols-2">

                <section className="hidden min-w-0 overflow-hidden rounded-2xl border border-border bg-muted/40 p-8 lg:block xl:p-12">
                    {sideContent}
                </section>

                <section className="flex min-w-0 items-center justify-center rounded-2xl border border-border bg-card px-5 py-10 sm:px-8 sm:py-12 lg:min-h-[640px] xl:px-12">
                    <div className="mx-auto w-full min-w-0 max-w-md">
                        {children}
                    </div>
                </section>

            </div>
        </main>
    );
}
