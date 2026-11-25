import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useId, useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { forgotPassword, signIn, signUp } from "../../../api/auth";
import { useAuth } from "../../../hooks/useAuth";
import {
    emailSchema,
    signInSchema,
    signUpSchema,
    type ForgotPasswordValues,
    type SignInValues,
    type SignUpValues,
} from "../schemas";
import { getQueryErrorMessage } from "../../../utils/queryErrors";

function PasswordField(props: Extract<ComponentProps<typeof FormField>, { as?: "input" }>) {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const { label, description, error, id, className, ...inputProps } = props;
    const controlId = id ?? `password-${generatedId.replaceAll(":", "")}`;

    return (
        <div className="grid w-full gap-1.5 text-sm">
            {label ? <label htmlFor={controlId} className="font-medium">{label}</label> : null}
            <div className="flex items-center gap-1 rounded-md border border-input bg-background px-2 focus-within:ring-2 focus-within:ring-ring/40">
                <Input {...inputProps} id={controlId} className={className} type={showPassword ? "text" : "password"} aria-invalid={error || undefined} />
                <Button size="icon" variant="ghost" aria-label={showPassword ? "Hide password" : "Show password"} type="button" onClick={() => setShowPassword((value) => !value)} onMouseDown={(event) => event.preventDefault()}>
                    {showPassword ? <EyeOff /> : <Eye />}
                </Button>
            </div>
            {description ? <span className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{description}</span> : null}
        </div>
    );
}

export function SignInForm() {
    const navigate = useNavigate();
    const { setAuthenticated } = useAuth();
    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });
    const {
        register: registerForgot,
        handleSubmit: handleForgotSubmit,
        reset: resetForgot,
        formState: {
            errors: forgotErrors,
            isSubmitting: isSubmittingForgot,
        },
    } = useForm<ForgotPasswordValues>({ resolver: zodResolver(emailSchema) });

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
            setServerError(getQueryErrorMessage(error, "Sign in failed."));
        }
    }

    async function onForgotPasswordSubmit(values: ForgotPasswordValues) {
        setForgotError("");
        try {
            await forgotPassword(values);
            setForgotDone(true);
        } catch (error) {
            setForgotError(getQueryErrorMessage(error, "Request failed."));
        }
    }

    function toggleForgotPassword() {
        const nextVisible = !forgotOpen;
        setForgotOpen(nextVisible);
        setForgotError("");
        setForgotDone(false);
        if (nextVisible) {
            resetForgot({ email: getValues("email") });
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {serverError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{serverError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <FormField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        {...register("email")}
                        error={!!errors.email}
                        description={errors.email?.message} />
                    <PasswordField
                        label="Password"
                        autoComplete="current-password"
                        {...register("password")}
                        error={!!errors.password}
                        description={errors.password?.message}
                    />
                    <FormField
                        label="Authenticator code"
                        autoComplete="one-time-code"
                        {...register("mfa_code")}
                        error={!!errors.mfa_code}
                        description={errors.mfa_code?.message || "Required for accounts with MFA enabled."} />
                    <Button type="submit" variant="default" disabled={isSubmitting}>
                        {isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>
            </form>
            <Button variant="ghost" onClick={toggleForgotPassword} type="button" aria-expanded={forgotOpen}>
                {forgotOpen ? "Hide password reset" : "Forgot password?"}
            </Button>
            {forgotOpen && <div className="flex flex-col gap-4">
                    <p className="text-muted-foreground">
                        Enter your email and we will send a reset link if an account exists.
                    </p>
                    {forgotDone && (
                        <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                            If that email exists, a reset link has been sent. Check your inbox.
                        </div>
                    )}
                    {forgotError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{forgotError}</div>}
                    <form onSubmit={handleForgotSubmit(onForgotPasswordSubmit)} className="flex flex-col gap-4">
                            <FormField
                                label="Email"
                                type="email"
                                {...registerForgot("email")}
                                error={!!forgotErrors.email}
                                description={forgotErrors.email?.message} />
                            <Button type="submit" variant="outline" disabled={isSubmittingForgot}>
                                {isSubmittingForgot ? "Sending..." : "Send reset link"}
                            </Button>
                    </form>
                </div>}
        </div>
    );
}

export function SignUpForm({ onSuccess }: { onSuccess: (message: string) => void }) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });
    const [serverError, setServerError] = useState("");

    async function onSubmit(values: SignUpValues) {
        setServerError("");
        try {
            const adminInviteCode = values.admin_invite_code?.trim();
            const result = await signUp({
                ...values,
                admin_invite_code: adminInviteCode || undefined,
            });
            onSuccess(result.detail);
        } catch (error) {
            setServerError(getQueryErrorMessage(error, "Sign up failed."));
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {serverError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{serverError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <FormField
                        label="Full name"
                        autoComplete="name"
                        {...register("full_name")}
                        error={!!errors.full_name}
                        description={errors.full_name?.message} />
                    <FormField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        {...register("email")}
                        error={!!errors.email}
                        description={errors.email?.message} />
                    <PasswordField
                        label="Password"
                        autoComplete="new-password"
                        {...register("password")}
                        error={!!errors.password}
                        description={errors.password?.message}
                    />
                    <PasswordField
                        label="Admin invite code"
                        autoComplete="one-time-code"
                        {...register("admin_invite_code")}
                        error={!!errors.admin_invite_code}
                        description={errors.admin_invite_code?.message || "Optional. Required only for admin registrations."}
                    />
                    <Button type="submit" variant="default" disabled={isSubmitting}>
                        {isSubmitting ? "Creating account..." : "Create account"}
                    </Button>
            </form>
        </div>
    );
}

