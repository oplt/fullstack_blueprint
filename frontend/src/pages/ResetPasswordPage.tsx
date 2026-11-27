import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link as RouterLink } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthShell } from "../components/auth/AuthShell";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import { getQueryErrorMessage } from "../utils/queryErrors";
import { useOneTimeAuthToken } from "../features/auth/hooks/useOneTimeAuthToken";

const schema = z
    .object({
        password: z.string().min(8, "At least 8 characters"),
        confirm_password: z.string(),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
    const token = useOneTimeAuthToken() ?? "";
    const [done, setDone] = useState(false);
    const [serverError, setServerError] = useState("");
    const { data: platformMetadata } = usePlatformMetadata();
    const appName = platformMetadata?.app_name ?? "Fullstack Blueprint";

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({ resolver: zodResolver(schema) });

    async function onSubmit(values: Values) {
        if (!token) {
            setServerError("Invalid or missing reset token.");
            return;
        }
        setServerError("");
        try {
            await resetPassword({ token, new_password: values.password });
            setDone(true);
        } catch (error) {
            setServerError(getQueryErrorMessage(error, "Reset failed."));
        }
    }

    return (
        <AuthShell
            sideContent={
                <AuthMarketingPanel
                    appName={appName}
                    eyebrow="Account recovery"
                    title="Reset access with confidence."
                    description="The recovery flow now matches the rest of the product: calmer layout, clearer feedback, and less ambiguity about what happens next."
                    highlights={[
                        { value: "1", label: "Secure token-based reset" },
                        { value: "2", label: "Clear validation feedback" },
                        { value: "3", label: "Fast path back to sign-in" },
                    ]}
                    points={[
                        "Choose a new password that is strong and memorable.",
                        "Once complete, you can return directly to sign in.",
                    ]}
                />
            }
        >
            <div className="flex gap-ui-lg">
                <div>
                    <span className="text-primary">
                        Reset password
                    </span>
                    <h4 className="mt-1" >
                        Choose a new password
                    </h4>
                    <span className="mt-ui-xs text-muted-foreground">
                        Use a secure password that you have not used elsewhere.
                    </span>
                </div>

                {done ? (
                    <div className="flex gap-ui-md">
                        <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">Password reset successfully.</div>
                        <Button variant="default" render={<RouterLink to="/" />} type="button">
                            Return to sign in
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-ui-md">
                            {serverError && <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">{serverError}</div>}
                            {!token && (
                                <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">
                                    No reset token found. Please use the link from your email.
                                </div>
                            )}
                            <FormField
                                label="New password"
                                type="password"
                                {...register("password")}
                                error={!!errors.password}
                                description={errors.password?.message} />
                            <FormField
                                label="Confirm new password"
                                type="password"
                                {...register("confirm_password")}
                                error={!!errors.confirm_password}
                                description={errors.confirm_password?.message} />
                            <Button type="submit" variant="default" disabled={isSubmitting || !token}>
                                {isSubmitting ? "Resetting..." : "Reset password"}
                            </Button>
                    </form>
                )}
            </div>
        </AuthShell>
    );
}
