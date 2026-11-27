import { useEffect, useState } from "react";
import { ErrorState } from "../../../components/ui/error-state";
import { Skeleton } from "../../../components/ui/skeleton";

type QrResult =
    | { uri: string; status: "success"; dataUrl: string }
    | { uri: string; status: "error" };

export function MfaQrCode({ provisioningUri }: { provisioningUri: string }) {
    const [result, setResult] = useState<QrResult | null>(null);
    const currentResult = result?.uri === provisioningUri ? result : null;

    useEffect(() => {
        let current = true;

        void import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(provisioningUri, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 220,
            // Keep printed QR pixels black on white so scans work in every theme.
            color: { dark: "#000000", light: "#ffffff" },
        })).then(
            dataUrl => {
                if (current) setResult({ uri: provisioningUri, status: "success", dataUrl });
            },
            () => {
                if (current) setResult({ uri: provisioningUri, status: "error" });
            },
        );

        return () => {
            current = false;
        };
    }, [provisioningUri]);

    return (
        <div className="flex shrink-0 items-center justify-center ui-auto-mfa-qr-code-div">
            {currentResult?.status === "success" ? (
                <img
                    src={currentResult.dataUrl}
                    alt="Scan this QR code with your authenticator app"
                    width={220}
                    height={220}
                    className="block ui-auto-mfa-qr-code-img"
                />
            ) : currentResult?.status === "error" ? (
                <ErrorState
                    title="QR code unavailable"
                    description="Failed to generate QR code."
                    className="h-full min-h-0 w-full ui-auto-mfa-qr-code-error-state"
                />
            ) : (
                <div role="status" aria-label="Generating QR code">
                    <Skeleton className="ui-auto-mfa-qr-code-skeleton" />
                </div>
            )}
        </div>
    );
}
