import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { Badge } from "@/components/ui/badge";import { Switch } from "@/components/ui/switch";import { colorMix } from "@/lib/color";import { Zap as BillingIcon, Flag as FlagIcon, KeyRound as KeyIcon, Link as LinkIcon, Webhook as WebhookIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import type { PlatformModel } from "../hooks/usePlatformView";

export function BillingSection({ m }: { m: PlatformModel }) { const plans = m.plansQuery.data; const subscription = m.subscriptionQuery.data; return (
  <SectionCard title="Billing" description="Review plans and switch when your usage changes.">{(m.subscriptionQuery.isError || m.plansQuery.isError) && <QueryErrorAlert error={m.subscriptionQuery.error ?? m.plansQuery.error} fallback="Failed to load billing data." onRetry={() => { void m.subscriptionQuery.refetch(); void m.plansQuery.refetch(); }} />}{m.subscriptionQuery.isLoading || m.plansQuery.isLoading ? <div className="gap-ui-sm" style={{ display: "grid", gridTemplateColumns: "1fr" }}>{Array.from({ length: 3 }).map((_: any, i: any) => <div key={i} className="ui-auto-platform-sections-billing-section-div" style={{
      height: 200
    }} />)}</div> : <div className="flex gap-ui-md"><div role="alert" className="ui-auto-platform-sections-billing-section-div-bac2659">Current plan: {subscription?.plan.name ?? "No plan selected"}</div>{!plans?.length ? <EmptyState icon={<BillingIcon />} title="No subscription plans yet" description="Plans will appear here once billing is configured for your workspace." /> : <div className="gap-ui-sm" style={{ display: "grid", gridTemplateColumns: "1fr" }}>{plans.map((plan) => { const current = subscription?.plan.code === plan.code; return (
      <div key={plan.id} style={({
        padding: 20,
        borderRadius: 16,
        border: `1px solid ${"var(--border)"}`,
        backgroundColor: current ? colorMix("var(--primary)", 0.1) : "var(--card)"
      })}><div className="flex gap-ui-sm"><div className="flex flex-col xl:flex-row justify-between"><div><h6>{plan.name}</h6><p>{plan.description || "Subscription plan"}</p></div><p>{formatCurrency(plan.price_cents)}/{plan.interval}</p></div><div className="flex flex-row flex-wrap gap-ui-xs">{plan.features.map((feature) => <Badge key={feature} variant="outline">{feature}</Badge>)}</div><Button
          variant={current ? "outline" : "default"}
          disabled={m.selectPlanMutation.isPending || current}
          onClick={() => m.selectPlanMutation.mutate(plan.code)}
          type="button">{current ? "Current plan" : "Switch plan"}</Button></div></div>
    ); })}</div>}</div>}</SectionCard>
); }

export function ApiKeysSection({ m }: { m: PlatformModel }) { const q = m.apiKeysQuery; return (
  <SectionCard title="API keys" description="Create and revoke developer credentials with cleaner visibility."><div className="flex gap-ui-md">{q.isError && <QueryErrorAlert error={q.error} fallback="Failed to load API keys." onRetry={() => void q.refetch()} />}{m.revealedKey && <div role="alert" className="ui-auto-platform-sections-api-keys-section-div">New key: <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{m.revealedKey}</span>. Copy it now. It will not be shown again.</div>}<div className="flex flex-col md:flex-row gap-ui-sm"><FormField
    label="Key name"
    value={m.apiKeyName}
    onChange={(e: any) => { m.setApiKeyName(e.target.value); m.setApiKeyNameError(null); }}
    error={Boolean(m.apiKeyNameError)}
    description={m.apiKeyNameError ?? "At least 2 characters. Shown in your key list only."} /><Button disabled={m.createApiKeyMutation.isPending || m.apiKeyName.trim().length < 2} onClick={() => { const name = m.apiKeyName.trim(); if (name.length < 2) m.setApiKeyNameError("Key name must be at least 2 characters."); else m.createApiKeyMutation.mutate(name); }} type="button">{m.createApiKeyMutation.isPending ? "Creating..." : "Create key"}</Button></div>{q.isLoading ? <div className="ui-auto-platform-sections-api-keys-section-div-27535a1" style={{
    height: 92
  }} /> : q.data?.length ? <div className="flex ui-auto-platform-sections-api-keys-section-div-08f0549">{q.data.map((key) => <div key={key.id} style={({
    padding: 18,
    borderRadius: 16,
    border: `1px solid ${"var(--border)"}`
  })}><div className="flex flex-col sm:flex-row justify-between"><div><p>{key.name}</p><p>Prefix {key.key_prefix}</p><span>Created {formatDateTime(key.created_at)}{key.last_used_at ? ` • Last used ${formatDateTime(key.last_used_at)}` : ""}</span></div><Button
    disabled={Boolean(key.revoked_at) || m.revokeApiKeyMutation.isPending}
    onClick={() => m.revokeApiKeyMutation.mutate(key.id)}
    type="button">{key.revoked_at ? "Revoked" : "Revoke"}</Button></div></div>)}</div> : <EmptyState icon={<KeyIcon />} title="No API keys yet" description="Create a key when you are ready to integrate external systems or automation." />}</div></SectionCard>
); }

export function WebhooksSection({ m }: { m: PlatformModel }) { const q = m.webhooksQuery; const d = m.webhookDraft; return (
  <SectionCard title="Webhooks" description="Configure delivery endpoints for outbound platform events."><div className="flex gap-ui-md">{q.isError && <QueryErrorAlert error={q.error} fallback="Failed to load webhooks." onRetry={() => void q.refetch()} />}{m.revealedWebhookSecret && <div role="alert" className="ui-auto-platform-sections-webhooks-section-div">New webhook signing secret: <strong>{m.revealedWebhookSecret}</strong></div>}{m.lastWebhookResult && <div role="alert" className="ui-auto-platform-sections-webhooks-section-div-bac2659">{m.lastWebhookResult}</div>}<div className="gap-ui-md" style={{ display: "grid", gridTemplateColumns: "1fr" }}><div className="flex gap-ui-sm"><FormField label="Target URL" value={d.target_url} onChange={(e: any) => { m.setWebhookUrlError(null); m.setWebhookDraft((v) => ({ ...v, target_url: e.target.value })); }} error={Boolean(m.webhookUrlError)} description={m.webhookUrlError ?? "Must be a valid http(s) URL"} /><FormField label="Description" value={d.description} onChange={(e: any) => m.setWebhookDraft((v) => ({ ...v, description: e.target.value }))} /><FormField label="Events" value={d.events} onChange={(e: any) => m.setWebhookDraft((v) => ({ ...v, events: e.target.value }))} description="Comma-separated event names" /><Button disabled={m.createWebhookMutation.isPending || d.target_url.trim().length < 8} onClick={m.submitWebhook} type="button">{m.createWebhookMutation.isPending ? "Creating..." : "Create webhook"}</Button></div>{q.isLoading ? <div className="ui-auto-platform-sections-webhooks-section-div-27535a1" style={{
      height: 148
    }} /> : q.data?.length ? <div className="flex ui-auto-platform-sections-webhooks-section-div-08f0549">{q.data.map((webhook) => <div key={webhook.id} style={({
      padding: 18,
      borderRadius: 16,
      border: `1px solid ${"var(--border)"}`
      })}><div className="flex gap-ui-sm"><div className="flex flex-col sm:flex-row justify-between"><div><p>{webhook.target_url}</p>{webhook.description && <p>{webhook.description}</p>}</div><Switch
        aria-label={`Activate webhook ${webhook.target_url}`}
        checked={webhook.is_active}
        disabled={m.toggleWebhookMutation.isPending}
        onCheckedChange={(checked) => m.toggleWebhookMutation.mutate({ id: webhook.id, is_active: checked })}
      /></div><div className="flex flex-row gap-ui-xs">{webhook.events.map((event) => <Badge key={event} variant="outline">{event}</Badge>)}</div><span>{webhook.last_tested_at ? `Last tested ${formatDateTime(webhook.last_tested_at)}` : "Not tested yet"}</span><div className="flex flex-row gap-ui-xs"><Button onClick={() => m.testWebhookMutation.mutate(webhook.id)} type="button"><LinkIcon />Test delivery</Button><Button onClick={() => m.deleteWebhookMutation.mutate(webhook.id)} type="button">Delete</Button></div></div></div>)}</div> : <EmptyState icon={<WebhookIcon />} title="No webhooks configured" description="Create an endpoint to push platform events into your own systems." />}</div></div></SectionCard>
); }

export function FlagsSection({ m }: { m: PlatformModel }) { const q = m.flagsQuery; return (
  <SectionCard title="Feature flags" description="These flags are active for your account based on current platform configuration.">{q.isError && <QueryErrorAlert error={q.error} fallback="Failed to load feature flags." onRetry={() => void q.refetch()} />}{q.isLoading ? <div className="ui-auto-platform-sections-flags-section-div" style={{
    height: 144
  }} /> : q.data?.length ? <div className="gap-ui-sm" style={{ display: "grid", gridTemplateColumns: "1fr" }}>{q.data.map((flag) => <div key={flag.id} style={({
    padding: 18,
    borderRadius: 16,
    border: `1px solid ${"var(--border)"}`
  })}><div className="flex gap-ui-xs"><div className="flex flex-row justify-between"><div><p>{flag.name}</p><p>{flag.key}</p></div><Badge variant={flag.is_enabled ? "success" : "secondary"}>{flag.is_enabled ? "Enabled" : "Disabled"}</Badge></div>{flag.description && <p>{flag.description}</p>}</div></div>)}</div> : <EmptyState icon={<FlagIcon />} title="No feature flags configured" description="Flags will appear here when the platform exposes rollout-based capabilities." />}</SectionCard>
); }
