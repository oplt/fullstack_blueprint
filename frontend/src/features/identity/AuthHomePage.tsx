
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { AuthMarketingPanel } from "./AuthMarketingPanel";
import { AuthShell } from "./AuthShell";
import { usePlatformMetadata } from "../platform/hooks";
import {
    SignInForm,
    SignUpForm,
} from "./AuthForms";

type Mode = "signIn" | "signUp";

export default function AuthHomePage() {
    const { data: platformMetadata } = usePlatformMetadata();

    const [mode, setMode] = useState<Mode>("signIn");
    const [successMsg, setSuccessMsg] = useState("");

    const appName =
        platformMetadata?.app_name ?? "Fullstack Blueprint";

    const coreDomainPlural =
        platformMetadata?.core_domain_plural ?? "projects";

    const domainName = coreDomainPlural.toLowerCase();

    const isSignIn = mode === "signIn";

    function changeMode(nextMode: Mode) {
        setMode(nextMode);
        setSuccessMsg("");
    }

    return (
        <AuthShell
            sideContent={
                <AuthMarketingPanel
                    appName={appName}
                    eyebrow="Launch-ready workspace"
                    title={`Manage your ${domainName}`}
                    description="Organize projects, assign tasks, and keep up with account activity."
                />
            }
        >
            <div className="flex w-full min-w-0 flex-col gap-ui-lg">
                <header className="flex flex-col gap-ui-xs">
                    <p className="text-body-md font-medium text-muted-foreground">
                        {appName}
                    </p>

                    <h2 className="text-page-title font-semibold sm:text-display-lg">
                        {isSignIn
                            ? "Welcome back"
                            : "Create your account"}
                    </h2>

                    <p className="text-body-md leading-relaxed text-muted-foreground">
                        {isSignIn
                            ? `Sign in to manage your ${domainName} and account activity.`
                            : `Create an account to manage your ${domainName}.`}
                    </p>
                </header>

                <div
                    role="group"
                    aria-label="Authentication mode"
                    className="grid w-full grid-cols-2 gap-ui-xxs rounded-lg bg-muted p-1"
                >
                    <Button
                        type="button"
                        variant={isSignIn ? "default" : "ghost"}
                        aria-pressed={isSignIn}
                        onClick={() => changeMode("signIn")}
                        className="h-auto min-h-(--control-height) min-w-0 whitespace-normal px-ui-xs"
                    >
                        Sign in
                    </Button>

                    <Button
                        type="button"
                        variant={!isSignIn ? "default" : "ghost"}
                        aria-pressed={!isSignIn}
                        onClick={() => changeMode("signUp")}
                        className="h-auto min-h-(--control-height) min-w-0 whitespace-normal px-ui-xs"
                    >
                        Create account
                    </Button>
                </div>

                {successMsg && (
                    <div
                        role="status"
                        className="rounded-lg border border-success/30 bg-success-soft p-ui-sm text-body-md text-success-deep"
                    >
                        {successMsg}
                    </div>
                )}

                <div className="w-full min-w-0">
                    {isSignIn ? (
                        <SignInForm />
                    ) : (
                        <SignUpForm
                            onSuccess={(message) => {
                                setSuccessMsg(message);
                                setMode("signIn");
                            }}
                        />
                    )}
                </div>

                <footer className="border-t border-border pt-ui-md">
                    <p className="text-center text-body-sm leading-relaxed text-muted-foreground">
                        By continuing, you are entering a cleaner
                        product experience with improved navigation,
                        readability, and trust cues.
                    </p>
                </footer>
            </div>
        </AuthShell>
    );
}
