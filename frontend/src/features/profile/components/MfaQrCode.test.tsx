import { render, screen, waitFor } from "@testing-library/react";
import QRCode from "qrcode";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MfaQrCode } from "./MfaQrCode";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn() } }));

type PendingQr = {
    uri: string;
    resolve: (dataUrl: string) => void;
    reject: (error: Error) => void;
};

const pending: PendingQr[] = [];

describe("MfaQrCode", () => {
    beforeEach(() => {
        pending.length = 0;
        vi.mocked(QRCode.toDataURL).mockImplementation(uri => new Promise((resolve, reject) => {
            pending.push({ uri, resolve, reject });
        }));
    });

    it("clears an old error and displays pending state for a new URI", async () => {
        const { rerender } = render(<MfaQrCode provisioningUri="otpauth://old" />);
        await waitFor(() => expect(pending).toHaveLength(1));
        pending[0].reject(new Error("generation failed"));

        expect(await screen.findByRole("alert")).toHaveTextContent("Failed to generate QR code.");

        rerender(<MfaQrCode provisioningUri="otpauth://new" />);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByRole("status", { name: "Generating QR code" })).toBeInTheDocument();
        await waitFor(() => expect(pending).toHaveLength(2));
        pending[1].resolve("data:image/png;base64,new");

        expect(await screen.findByRole("img", { name: "Scan this QR code with your authenticator app" }))
            .toHaveAttribute("src", "data:image/png;base64,new");
    });

    it("ignores a stale QR completion after the URI changes", async () => {
        const { rerender } = render(<MfaQrCode provisioningUri="otpauth://old" />);
        await waitFor(() => expect(pending).toHaveLength(1));

        rerender(<MfaQrCode provisioningUri="otpauth://new" />);
        await waitFor(() => expect(pending).toHaveLength(2));
        pending[0].resolve("data:image/png;base64,old");

        expect(screen.getByRole("status", { name: "Generating QR code" })).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        pending[1].resolve("data:image/png;base64,new");

        expect(await screen.findByRole("img", { name: "Scan this QR code with your authenticator app" }))
            .toHaveAttribute("src", "data:image/png;base64,new");
    });

    it("keeps scan-safe third-party rendering geometry and colors", async () => {
        render(<MfaQrCode provisioningUri="otpauth://scan-safe" />);

        await waitFor(() => expect(QRCode.toDataURL).toHaveBeenCalledWith(
            "otpauth://scan-safe",
            expect.objectContaining({
                width: 220,
                margin: 1,
                color: { dark: "#000000", light: "#ffffff" },
            }),
        ));
    });
});
