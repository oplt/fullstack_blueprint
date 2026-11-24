import { useEffect, useState } from "react";import QRCode from "qrcode";
export function MfaQrCode({ provisioningUri }: { provisioningUri: string }) { const [url, setUrl] = useState<string | null>(null); const [error, setError] = useState(false); useEffect(() => { let active = true; void QRCode.toDataURL(provisioningUri, { errorCorrectionLevel: "M", margin: 1, width: 220 }).then((value) => { if (active) setUrl(value); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [provisioningUri]); if (error) return <div role="alert" className="rounded-lg border border-border p-3 text-sm">Failed to generate QR code.</div>; return (
  <div
    style={{ padding: 16, alignSelf: "flex-start", borderRadius: 12, backgroundColor: "var(--card)" }}>{url ? <img src={url}
    alt="Scan this QR code with your authenticator app"
    style={{ display: "block", width: 220, height: 220 }} /> : <div
    className="animate-pulse rounded-md bg-muted"
    style={{
      height: 220,
      width: 220
    }} />}</div>
); }
