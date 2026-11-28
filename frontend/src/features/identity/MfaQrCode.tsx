import { useEffect, useState } from "react";
import { ErrorState } from "../../components/Feedback";
import { Skeleton } from "../../components/ui/skeleton";

type QrResult =
    | { uri: string; status: "success"; dataUrl: string }
    | { uri: string; status: "error" };

const QR_CODE_SIZE = 220;

export function MfaQrCode({ provisioningUri }: { provisioningUri: string }) {
    const [result, setResult] = useState<QrResult | null>(null);
    const currentResult = result?.uri === provisioningUri ? result : null;

    useEffect(() => {
        let current = true;

        void import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(provisioningUri, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: QR_CODE_SIZE,
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
        <div className="ui-mfa-qr-frame">
            {currentResult?.status === "success" ? (
                <img
                    src={currentResult.dataUrl}
                    alt="Scan this QR code with your authenticator app"
                    width={QR_CODE_SIZE}
                    height={QR_CODE_SIZE}
                    className="ui-mfa-qr-image"
                />
            ) : currentResult?.status === "error" ? (
                <ErrorState
                    title="QR code unavailable"
                    description="Failed to generate QR code."
                    className="h-full min-h-0 w-full border-0 bg-transparent p-0"
                />
            ) : (
                <div role="status" aria-label="Generating QR code">
                    <Skeleton className="ui-mfa-qr-image" />
                </div>
            )}
        </div>
    );
}
