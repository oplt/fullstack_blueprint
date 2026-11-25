
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthShell } from "../components/auth/AuthShell";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import {
    SignInForm,
    SignUpForm,
} from "../features/auth/components/AuthForms";

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
            <div className="flex w-full min-w-0 flex-col gap-6">
                <header className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        {appName}
                    </p>

                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        {isSignIn
                            ? "Welcome back"
                            : "Create your account"}
                    </h2>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {isSignIn
                            ? `Sign in to manage your ${domainName} and account activity.`
                            : `Create an account to manage your ${domainName}.`}
                    </p>
                </header>

                <div
                    role="group"
                    aria-label="Authentication mode"
                    className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                >
                    <Button
                        type="button"
                        variant={isSignIn ? "default" : "ghost"}
                        aria-pressed={isSignIn}
                        onClick={() => changeMode("signIn")}
                        className="h-auto min-h-10 min-w-0 whitespace-normal px-2"
                    >
                        Sign in
                    </Button>

                    <Button
                        type="button"
                        variant={!isSignIn ? "default" : "ghost"}
                        aria-pressed={!isSignIn}
                        onClick={() => changeMode("signUp")}
                        className="h-auto min-h-10 min-w-0 whitespace-normal px-2"
                    >
                        Create account
                    </Button>
                </div>

                {successMsg && (
                    <div
                        role="status"
                        className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"
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

                <footer className="border-t border-border pt-4">
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                        By continuing, you are entering a cleaner
                        product experience with improved navigation,
                        readability, and trust cues.
                    </p>
                </footer>
            </div>
        </AuthShell>
    );
}
