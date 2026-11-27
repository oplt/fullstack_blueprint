
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
            <div className="flex w-full min-w-0 flex-col gap-ui-lg">
                <header className="flex flex-col gap-ui-xs">
                    <p className="ui-auto-auth-home-page-p">
                        {appName}
                    </p>

                    <h2 className="ui-auto-auth-home-page-h2">
                        {isSignIn
                            ? "Welcome back"
                            : "Create your account"}
                    </h2>

                    <p className="ui-auto-auth-home-page-p-a4881c3">
                        {isSignIn
                            ? `Sign in to manage your ${domainName} and account activity.`
                            : `Create an account to manage your ${domainName}.`}
                    </p>
                </header>

                <div
                    role="group"
                    aria-label="Authentication mode"
                    className="grid w-full ui-auto-auth-home-page-div"
                >
                    <Button
                        type="button"
                        variant={isSignIn ? "default" : "ghost"}
                        aria-pressed={isSignIn}
                        onClick={() => changeMode("signIn")}
                        className="h-auto min-w-0 whitespace-normal ui-auto-auth-home-page-button"
                    >
                        Sign in
                    </Button>

                    <Button
                        type="button"
                        variant={!isSignIn ? "default" : "ghost"}
                        aria-pressed={!isSignIn}
                        onClick={() => changeMode("signUp")}
                        className="h-auto min-w-0 whitespace-normal ui-auto-auth-home-page-button-677d00d"
                    >
                        Create account
                    </Button>
                </div>

                {successMsg && (
                    <div
                        role="status"
                        className="ui-auto-auth-home-page-div-d6e4d87"
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

                <footer className="ui-auto-auth-home-page-footer">
                    <p className="ui-auto-auth-home-page-p-19643f0">
                        By continuing, you are entering a cleaner
                        product experience with improved navigation,
                        readability, and trust cues.
                    </p>
                </footer>
            </div>
        </AuthShell>
    );
}
