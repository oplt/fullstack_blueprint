import type { AuthUser } from "../../../api/auth";
import { SectionCard } from "../../../components/ui/SectionCard";

type Props = { user: AuthUser | null };

function AccountCheck({
    label, active, activeValue, inactiveValue, activeDescription, inactiveDescription,
}: {
    label: string;
    active: boolean;
    activeValue: string;
    inactiveValue: string;
    activeDescription: string;
    inactiveDescription: string;
}) {
    return (
        <div className="dashboard-health__item">
            <div className="mb-1 flex flex-row justify-between gap-2">
                <p>{label}</p>
                <p className={`font-medium ${active ? "text-success" : "text-warning"}`}>
                    {active ? activeValue : inactiveValue}
                </p>
            </div>
            <p className="text-muted-foreground">
                {active ? activeDescription : inactiveDescription}
            </p>
        </div>
    );
}

export function AccountHealthCard({ user }: Props) {
    return (
        <SectionCard title="Account health" description="Settings that affect trust and security." compact contentClassName="flex flex-col">
            <div className="dashboard-health">
                <AccountCheck
                    label="Email verification"
                    active={user?.is_verified ?? false}
                    activeValue="Verified"
                    inactiveValue="Action needed"
                    activeDescription="Your sign-in identity is confirmed."
                    inactiveDescription="Verify your email to improve recovery and trust."
                />
                <AccountCheck
                    label="Multi-factor authentication"
                    active={user?.mfa_enabled ?? false}
                    activeValue="Enabled"
                    inactiveValue="Recommended"
                    activeDescription="An extra layer of account protection is active."
                    inactiveDescription="Turn on MFA to reduce account risk."
                />
            </div>
        </SectionCard>
    );
}
