
import { useId, useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import {
    forgotPassword,
    signIn,
    signUp,
} from "../../../api/auth";

import { useAuth } from "../../../hooks/useAuth";
import { getQueryErrorMessage } from "../../../utils/queryErrors";

import {
    emailSchema,
    signInSchema,
    signUpSchema,
    type ForgotPasswordValues,
    type SignInValues,
    type SignUpValues,
} from "../schemas";

type PasswordFieldProps = Omit<Extract<
    ComponentProps<typeof FormField>,
    { as?: "input" }
>, "as">;

function PasswordField(props: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();

    const {
        label,
        description,
        error,
        id,
        className,
        disabled,
        ...inputProps
    } = props;

    const controlId = id ?? generatedId;
    const descriptionId = `${controlId}-description`;

    const describedBy =
        [
            inputProps["aria-describedby"],
            description ? descriptionId : undefined,
        ]
            .filter(Boolean)
            .join(" ") || undefined;

    return (
        <div className="flex w-full min-w-0 flex-col gap-2">
            {label && (
                <Label htmlFor={controlId}>
                    {label}
                </Label>
            )}

            <div className="relative w-full min-w-0">
                <Input
                    {...inputProps}
                    id={controlId}
                    type={showPassword ? "text" : "password"}
                    disabled={disabled}
                    aria-invalid={
                        error || inputProps["aria-invalid"]
                    }
                    aria-describedby={describedBy}
                    className={cn("w-full pr-12", className)}
                />

                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    aria-label={
                        showPassword
                            ? "Hide password"
                            : "Show password"
                    }
                    aria-controls={controlId}
                    onClick={() =>
                        setShowPassword((current) => !current)
                    }
                    onMouseDown={(event) =>
                        event.preventDefault()
                    }
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    {showPassword ? (
                        <EyeOff
                            className="size-4"
                            aria-hidden="true"
                        />
                    ) : (
                        <Eye
                            className="size-4"
                            aria-hidden="true"
                        />
                    )}
                </Button>
            </div>

            {description && (
                <p
                    id={descriptionId}
                    className={cn(
                        "text-xs leading-relaxed",
                        error
                            ? "text-destructive-deep"
                            : "text-muted-foreground",
                    )}
                >
                    {description}
                </p>
            )}
        </div>
    );
}

function AuthError({ message }: { message: string }) {
    if (!message) {
        return null;
    }

    return (
        <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm leading-relaxed text-destructive-deep"
        >
            {message}
        </div>
    );
}

function AuthSuccess({ message }: { message: string }) {
    if (!message) {
        return null;
    }

    return (
        <div
            role="status"
            className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm leading-relaxed text-success-deep"
        >
            {message}
        </div>
    );
}

export function SignInForm() {
    const navigate = useNavigate();
    const { setAuthenticated } = useAuth();
    const forgotPanelId = useId();

    const {
        register,
        handleSubmit,
        getValues,
        formState: {
            errors,
            isSubmitting,
        },
    } = useForm<SignInValues>({
        resolver: zodResolver(signInSchema),
    });

    const {
        register: registerForgot,
        handleSubmit: handleForgotSubmit,
        reset: resetForgot,
        formState: {
            errors: forgotErrors,
            isSubmitting: isSubmittingForgot,
        },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(emailSchema),
    });

    const [serverError, setServerError] = useState("");
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotDone, setForgotDone] = useState(false);
    const [forgotError, setForgotError] = useState("");

    async function onSubmit(values: SignInValues) {
        setServerError("");

        try {
            const mfaCode = values.mfa_code?.trim();

            const data = await signIn({
                ...values,
                mfa_code: mfaCode || undefined,
            });

            setAuthenticated(data.user);

            navigate(ROUTES.dashboard);
        } catch (error) {
            setServerError(
                getQueryErrorMessage(error, "Sign in failed."),
            );
        }
    }

    async function onForgotPasswordSubmit(
        values: ForgotPasswordValues,
    ) {
        setForgotError("");
        setForgotDone(false);

        try {
            await forgotPassword(values);
            setForgotDone(true);
        } catch (error) {
            setForgotError(
                getQueryErrorMessage(error, "Request failed."),
            );
        }
    }

    function toggleForgotPassword() {
        const nextVisible = !forgotOpen;

        setForgotOpen(nextVisible);
        setForgotError("");
        setForgotDone(false);

        if (nextVisible) {
            resetForgot({
                email: getValues("email") ?? "",
            });
        }
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-4">
            <AuthError message={serverError} />

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex w-full min-w-0 flex-col gap-4"
                aria-busy={isSubmitting}
                noValidate
            >
                <FormField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    disabled={isSubmitting}
                    {...register("email")}
                    error={!!errors.email}
                    description={errors.email?.message}
                />

                <PasswordField
                    label="Password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    {...register("password")}
                    error={!!errors.password}
                    description={errors.password?.message}
                />

                <FormField
                    label="Authenticator code"
                    type="text"
                    autoComplete="one-time-code"
                    placeholder="Enter your authenticator code"
                    disabled={isSubmitting}
                    {...register("mfa_code")}
                    error={!!errors.mfa_code}
                    description={
                        errors.mfa_code?.message ||
                        "Required for accounts with MFA enabled."
                    }
                />

                <Button
                    type="submit"
                    variant="default"
                    disabled={isSubmitting}
                    className="mt-2 w-full"
                >
                    {isSubmitting && (
                        <LoaderCircle
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}

                    {isSubmitting
                        ? "Signing in..."
                        : "Sign in"}
                </Button>
            </form>

            <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting || isSubmittingForgot}
                onClick={toggleForgotPassword}
                aria-expanded={forgotOpen}
                aria-controls={forgotPanelId}
                className="w-full text-sm"
            >
                {forgotOpen
                    ? "Hide password reset"
                    : "Forgot password?"}
            </Button>

            {forgotOpen && (
                <section
                    id={forgotPanelId}
                    aria-label="Password recovery"
                    className="flex w-full min-w-0 flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4"
                >
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold">
                            Reset your password
                        </h3>

                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Enter your email address and we will
                            send a reset link if an account exists.
                        </p>
                    </div>

                    {forgotDone && (
                        <AuthSuccess
                            message="If that email exists, a reset link has been sent. Check your inbox."
                        />
                    )}

                    <AuthError message={forgotError} />

                    <form
                        onSubmit={handleForgotSubmit(
                            onForgotPasswordSubmit,
                        )}
                        className="flex w-full flex-col gap-4"
                        aria-busy={isSubmittingForgot}
                        noValidate
                    >
                        <FormField
                            label="Email"
                            type="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            disabled={isSubmittingForgot}
                            {...registerForgot("email")}
                            error={!!forgotErrors.email}
                            description={
                                forgotErrors.email?.message
                            }
                        />

                        <Button
                            type="submit"
                            variant="outline"
                            disabled={isSubmittingForgot}
                            className="w-full"
                        >
                            {isSubmittingForgot && (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}

                            {isSubmittingForgot
                                ? "Sending..."
                                : "Send reset link"}
                        </Button>
                    </form>
                </section>
            )}
        </div>
    );
}

type SignUpFormProps = {
    onSuccess: (message: string) => void;
};

export function SignUpForm({
    onSuccess,
}: SignUpFormProps) {
    const {
        register,
        handleSubmit,
        formState: {
            errors,
            isSubmitting,
        },
    } = useForm<SignUpValues>({
        resolver: zodResolver(signUpSchema),
    });

    const [serverError, setServerError] = useState("");

    async function onSubmit(values: SignUpValues) {
        setServerError("");

        try {
            const adminInviteCode =
                values.admin_invite_code?.trim();

            const result = await signUp({
                ...values,
                admin_invite_code:
                    adminInviteCode || undefined,
            });

            onSuccess(result.detail);
        } catch (error) {
            setServerError(
                getQueryErrorMessage(error, "Sign up failed."),
            );
        }
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-4">
            <AuthError message={serverError} />

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex w-full min-w-0 flex-col gap-4"
                aria-busy={isSubmitting}
                noValidate
            >
                <FormField
                    label="Full name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    disabled={isSubmitting}
                    {...register("full_name")}
                    error={!!errors.full_name}
                    description={errors.full_name?.message}
                />

                <FormField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    disabled={isSubmitting}
                    {...register("email")}
                    error={!!errors.email}
                    description={errors.email?.message}
                />

                <PasswordField
                    label="Password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    disabled={isSubmitting}
                    {...register("password")}
                    error={!!errors.password}
                    description={errors.password?.message}
                />

                <PasswordField
                    label="Admin invite code"
                    autoComplete="one-time-code"
                    placeholder="Enter invite code (optional)"
                    disabled={isSubmitting}
                    {...register("admin_invite_code")}
                    error={!!errors.admin_invite_code}
                    description={
                        errors.admin_invite_code?.message ||
                        "Optional. Required only for admin registrations."
                    }
                />

                <Button
                    type="submit"
                    variant="default"
                    disabled={isSubmitting}
                    className="mt-2 w-full"
                >
                    {isSubmitting && (
                        <LoaderCircle
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}

                    {isSubmitting
                        ? "Creating account..."
                        : "Create account"}
                </Button>
            </form>
        </div>
    );
}
