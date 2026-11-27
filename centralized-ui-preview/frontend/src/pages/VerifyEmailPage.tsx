import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { resendVerification, verifyEmail } from "../api/auth";
import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthShell } from "../components/auth/AuthShell";
import { emailSchema } from "../features/auth/schemas";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import { getQueryErrorMessage } from "../utils/queryErrors";
import { useOneTimeAuthToken } from "../features/auth/hooks/useOneTimeAuthToken";

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = useOneTimeAuthToken();
    const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
    const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(
        token ? "loading" : "no-token"
    );
    const [resendDone, setResendDone] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendError, setResendError] = useState("");
    const verificationToken = useRef<string | null>(null);
    const { data: platformMetadata } = usePlatformMetadata();
    const appName = platformMetadata?.app_name ?? "Fullstack Blueprint";

    useEffect(() => {
        if (!token) {
            return;
        }
        if (verificationToken.current === token) return;
        verificationToken.current = token;
        verifyEmail({ token })
            .then(() => setStatus("success"))
            .catch(() => setStatus("error"));
    }, [token]);

    async function handleResend() {
        const parsed = emailSchema.safeParse({ email: email.trim() });
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
            <div className="flex gap-ui-lg">
                <div>
                    <span className="text-primary">
                        Email verification
                    </span>
                    <h4 className="mt-ui-xxs" >
                        Confirm your email address
                    </h4>
                    <span className="ui-auto-verify-email-page-span">
                        Verification improves account trust and unlocks the full sign-in experience.
                    </span>
                </div>

                {status === "loading" && (
                    <div className="py-ui-xl" style={{ display: "grid", placeItems: "center" }}>
                        <span
                            className="inline-block ui-auto-verify-email-page-span-279d8a6"
                            role="progressbar" />
                    </div>
                )}

                {status === "success" && (
                    <div className="flex gap-ui-md">
                        <div role="alert" className="ui-auto-verify-email-page-div">Your email has been verified. You can now sign in.</div>
                        <Button variant="default" render={<RouterLink to="/" />} type="button">
                            Go to sign in
                        </Button>
                    </div>
                )}

                {(status === "error" || status === "no-token") && (
                    <div className="flex gap-ui-md">
                        {status === "error" && (
                            <div role="alert" className="ui-auto-verify-email-page-div-bac2659">
                                The verification link is invalid or has expired.
                            </div>
                        )}
                        {status === "no-token" && (
                            <div role="alert" className="ui-auto-verify-email-page-div-bac2659-x">
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
                        {resendDone && <div role="alert" className="ui-auto-verify-email-page-div-bac2659-x-x">A new verification email has been sent.</div>}
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
