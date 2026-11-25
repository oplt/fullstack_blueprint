import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthShell } from "../components/auth/AuthShell";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import { SignInForm, SignUpForm } from "../features/auth/components/AuthForms";

type Mode = "signIn" | "signUp";

export default function AuthHomePage() {
    const { data: platformMetadata } = usePlatformMetadata();
    const [mode, setMode] = useState<Mode>("signIn");
    const [successMsg, setSuccessMsg] = useState("");

    const appName = platformMetadata?.app_name ?? "Fullstack Blueprint";
    const coreDomainPlural = platformMetadata?.core_domain_plural ?? "projects";

    return (
        <AuthShell
            sideContent={
                <AuthMarketingPanel
                    appName={appName}
                    eyebrow="Launch-ready workspace"
                    title={`Manage your ${coreDomainPlural.toLowerCase()}`}
                    description="Organize projects, assign tasks, and keep up with account activity."
                />
            }
        >
            <div className="flex gap-[24px]">
                <div>
                    <span style={{ display: "block" }} className="text-muted-foreground">
                        {appName}
                    </span>
                    <h4 style={{ marginTop: 4 }}>
                        {mode === "signIn" ? "Welcome back" : "Create your account"}
                    </h4>
                    <span className="mt-2 text-muted-foreground">
                        {mode === "signIn"
                            ? `Sign in to manage your ${coreDomainPlural.toLowerCase()} and account activity.`
                            : `Create an account to manage your ${coreDomainPlural.toLowerCase()}.`}
                    </span>
                </div>

                <div
                    style={({
                        padding: 4,
                        borderRadius: 4,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 4,

                        backgroundColor: "var(--card)"
                    })}
                >
                    <Button
                        variant={mode === "signIn" ? "default" : "ghost"}
                        onClick={() => {
                            setMode("signIn");
                            setSuccessMsg("");
                        }}
                        type="button">
                        Sign in
                    </Button>
                    <Button
                        variant={mode === "signUp" ? "default" : "ghost"}
                        onClick={() => {
                            setMode("signUp");
                            setSuccessMsg("");
                        }}
                        type="button">
                        Create account
                    </Button>
                </div>

                {successMsg && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{successMsg}</div>}

                {mode === "signIn" ? (
                    <SignInForm />
                ) : (
                    <SignUpForm
                        onSuccess={(message) => {
                            setSuccessMsg(message);
                            setMode("signIn");
                        }}
                    />
                )}

                <p className="text-muted-foreground">
                    By continuing, you are entering a cleaner product experience with improved navigation, readability, and trust cues.
                </p>
            </div>
        </AuthShell>
    );
}
