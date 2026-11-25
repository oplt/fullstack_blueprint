import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { resendVerification, verifyEmail } from "../api/auth";
import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthShell } from "../components/auth/AuthShell";
import { resendVerificationSchema } from "../features/auth/schemas";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import { getQueryErrorMessage } from "../utils/queryErrors";
import { parseRequiredParam } from "../app/searchParams";

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = parseRequiredParam(searchParams.get("token"));
    const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
    const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(
        token ? "loading" : "no-token"
    );
    const [resendDone, setResendDone] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendError, setResendError] = useState("");
    const { data: platformMetadata } = usePlatformMetadata();
    const appName = platformMetadata?.app_name ?? "Fullstack Blueprint";

    useEffect(() => {
        if (!token) {
            return;
        }
        verifyEmail({ token })
            .then(() => setStatus("success"))
            .catch(() => setStatus("error"));
    }, [token]);

    async function handleResend() {
        const parsed = resendVerificationSchema.safeParse({ email: email.trim() });
        if (!parsed.success) {
            setResendError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
            return;
        }

        setResending(true);
        setResendError("");
        try {
            await resendVerification({ email: parsed.data.email });
            setResendDone(true);
        } catch (error) {
            setResendError(getQueryErrorMessage(error, "Failed to resend verification email."));
        } finally {
            setResending(false);
        }
    }

    return (
        <AuthShell
            sideContent={
                <AuthMarketingPanel
                    appName={appName}
                    eyebrow="Identity confirmation"
                    title="Verify your email and unlock the full experience."
                    description="The verification flow is clearer now, with direct guidance when links expire and a simpler resend path when users need another attempt."
                    highlights={[
                        { value: "Trust", label: "Better account legitimacy signals" },
                        { value: "Clarity", label: "More obvious next steps" },
                        { value: "Speed", label: "A simpler resend flow" },
                    ]}
                    points={[
                        "Use the original verification link if it is still valid.",
                        "If it expired, request another message without leaving the page.",
                    ]}
                />
            }
        >
            <div className="flex gap-[24px]">
                <div>
                    <span className="text-primary">
                        Email verification
                    </span>
                    <h4 style={{ marginTop: 4 }}>
                        Confirm your email address
                    </h4>
                    <span style={{ marginTop: 8 }} className="text-muted-foreground">
                        Verification improves account trust and unlocks the full sign-in experience.
                    </span>
                </div>

                {status === "loading" && (
                    <div style={{ display: "grid", placeItems: "center", paddingBlock: 32 }}>
                        <span
                            className="inline-block animate-spin rounded-full border-2 border-primary border-t-transparent"
                            role="progressbar" />
                    </div>
                )}

                {status === "success" && (
                    <div className="flex gap-[16px]">
                        <div role="alert" className="rounded-lg border border-border p-3 text-sm">Your email has been verified. You can now sign in.</div>
                        <Button variant="default" render={<RouterLink to="/" />} type="button">
                            Go to sign in
                        </Button>
                    </div>
                )}

                {(status === "error" || status === "no-token") && (
                    <div className="flex gap-[16px]">
                        {status === "error" && (
                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                The verification link is invalid or has expired.
                            </div>
                        )}
                        {status === "no-token" && (
                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                Check your email for a verification link, or request a new one below.
                            </div>
                        )}
                        <FormField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(event: any) => {
                                setEmail(event.target.value);
                                setResendError("");
                            }}
                            error={Boolean(resendError) && !resendDone}
                            description={
                                resendError && !resendDone ? resendError : "Use the same address you registered with."
                            } />
                        {resendDone && <div role="alert" className="rounded-lg border border-border p-3 text-sm">A new verification email has been sent.</div>}
                        {!resendDone && (
                            <Button
                                variant="default"
                                disabled={resending}
                                onClick={handleResend}
                                type="button">
                                {resending ? "Sending..." : "Resend verification email"}
                            </Button>
                        )}
                        <Button variant="ghost" render={<RouterLink to="/" />} type="button">
                            Back to sign in
                        </Button>
                    </div>
                )}
            </div>
        </AuthShell>
    );
}
