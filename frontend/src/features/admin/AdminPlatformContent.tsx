import type { EmailTemplate } from "@/features/notifications/emailTemplatesApi";
import type { FeatureFlag } from "@/features/admin/featureFlagsApi";
import type { PlatformConfig } from "@/lib/platformApi";
import type { SubscriptionPlan } from "@/features/billing/api";
import { SettingsTabs } from "../../app/SettingsTabs";
import { PageShell } from "../../components/ui/PageShell";
import { usePlatformAdminContent } from "./usePlatformAdminContent";
import { AdminPlatformStats } from "./AdminPlatformStats";
import { CloneConfigSection } from "./CloneConfigSection";
import { FlagsSection } from "./FlagsSection";
import { PlansSection } from "./PlansSection";
import { TemplatesSection } from "./TemplatesSection";

export function AdminPlatformContent({ config, plans, flags, templates }: { config: PlatformConfig; plans: SubscriptionPlan[]; flags: FeatureFlag[]; templates: EmailTemplate[] }) {
    const model = usePlatformAdminContent(config, plans, flags, templates);
    return <PageShell width="wide"><SettingsTabs /><AdminPlatformStats config={model.configDraft} plans={plans} flags={flags} templates={templates} />
        <CloneConfigSection source={config} model={model} /><PlansSection plans={plans} model={model} />
        <FlagsSection flags={flags} model={model} /><TemplatesSection templates={templates} model={model} />
    </PageShell>;
}
