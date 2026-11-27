import type { AuthUser } from "../../../api/auth";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { SectionCard } from "../../../components/ui/SectionCard";
type Props = { user: AuthUser | null };
function AccountCheck({ label, active, activeValue, inactiveValue, activeDescription, inactiveDescription }: { label: string; active: boolean; activeValue: string; inactiveValue: string; activeDescription: string; inactiveDescription: string }) {
    return <Card size="sm" className="ui-account-check"><CardContent><div className="ui-health-header"><p className="text-label-sm">{label}</p><Badge variant={active ? "success" : "warning"}>{active ? activeValue : inactiveValue}</Badge></div><p className="ui-account-check-description">{active ? activeDescription : inactiveDescription}</p></CardContent></Card>;
}
export function AccountHealthCard({ user }: Props) {
    return <SectionCard title="Account health" description="Settings that affect trust and security." compact contentClassName="flex flex-col">
        <div className="ui-account-health">
            <AccountCheck label="Email verification" active={user?.is_verified ?? false} activeValue="Verified" inactiveValue="Action needed" activeDescription="Your sign-in identity is confirmed." inactiveDescription="Verify your email to improve recovery and trust." />
            <AccountCheck label="Multi-factor authentication" active={user?.mfa_enabled ?? false} activeValue="Enabled" inactiveValue="Recommended" activeDescription="An extra layer of account protection is active." inactiveDescription="Turn on MFA to reduce account risk." />
        </div>
    </SectionCard>;
}
