import { Puzzle, Flag as FlagIcon, Mail, Tag } from "lucide-react";
import type { EmailTemplate } from "../../../api/platform/emailTemplates";
import type { FeatureFlag } from "../../../api/platform/featureFlags";
import type { SubscriptionPlan } from "../../../api/platform/billing";
import { StatCard } from "../../../components/ui/StatCard";
import type { ConfigDraft } from "../platformAdminModel";

export function AdminPlatformStats({ config, plans, flags, templates }: { config: ConfigDraft; plans: SubscriptionPlan[]; flags: FeatureFlag[]; templates: EmailTemplate[] }) {
    return (
        <div className="gap-4" style={{ display: "grid", gridTemplateColumns: "1fr" }}>
            <StatCard label="Enabled modules" value={Object.values(config.module_states).filter(Boolean).length} description="Modules currently exposed by the selected pack and overrides" icon={<Puzzle />} />
            <StatCard label="Subscription plans" value={plans.length} description="Commercial tiers available across the platform" icon={<Tag />} color="secondary" />
            <StatCard label="Feature flags" value={flags.length} description="Flags available for rollout and experimentation" icon={<FlagIcon />} color="success" />
            <StatCard label="Email templates" value={templates.length} description="Transactional templates ready for automated delivery" icon={<Mail />} color="warning" />
        </div>
    );
}
