import { useCallback, useState } from "react";
import { useNotification } from "../components/Notifications";
import { readAudioMetadata } from "../services/readAudioMetadata";

export function useMetadataReader() {
    const notify = useNotification();
    const [state, setState] = useState({ fileName: "", metadata: null });

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        setState({ fileName: file.name, metadata: null });
        try {
            const result = await readAudioMetadata(file);
            if (result.status === "unrecognized") {
                notify("Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja.", "danger");
                return;
            }
            setState((current) => ({ ...current, metadata: result }));
        } catch (error) {
            console.error("Error reading metadata:", error);
            notify("Tiedoston metatietoja ei voitu lukea. Tarkista tiedosto ja yritä uudelleen.", "danger");
        }
    }, [notify]);

    const setTrackMetadata = useCallback((nextMetadata) => {
        setState((current) => ({
            ...current,
            metadata: {
                ...current.metadata,
                trackMetadata: typeof nextMetadata === "function"
                    ? nextMetadata(current.metadata.trackMetadata)
                    : nextMetadata
            }
        }));
    }, []);

    return { ...state, handleFileUpload, setTrackMetadata };
}
