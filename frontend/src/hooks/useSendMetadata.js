import { useCallback, useState } from "react";
import { useNotification } from "../components/Notifications";

export function useSendMetadata(trackMetadata) {
    const notify = useNotification();
    const [isSending, setIsSending] = useState(false);

    const handleSendMetadata = useCallback(async () => {
        if (!trackMetadata || isSending) return;

        setIsSending(true);
        try {
            const response = await fetch("/api/tracks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(trackMetadata)
            });
            if (!response.ok) {
                throw new Error(`Metadatan lähetys epäonnistui (HTTP ${response.status}).`);
            }
            if (response.status === 202) {
                notify(
                    "Metadata vastaanotettiin ja kirjattiin backendin lokiin, mutta sitä ei tallenneta pysyvästi.",
                    "info"
                );
            } else {
                notify("Metadata lähetetty onnistuneesti.", "success");
            }
        } catch (error) {
            console.error("Error sending metadata:", error);
            notify(
                error instanceof Error
                    ? error.message
                    : "Metadatan lähetys epäonnistui.",
                "danger"
            );
        } finally {
            setIsSending(false);
        }
    }, [isSending, notify, trackMetadata]);

    return { isSending, handleSendMetadata };
}
