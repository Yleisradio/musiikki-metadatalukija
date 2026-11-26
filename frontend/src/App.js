import React, { useState } from "react";
import "./App.css";
import FileUpload from "./components/FileUpload";
import MainMetadataView from "./components/MainMetadataView";
import MetadataView from "./components/MetadataView";
import MetadataTabs from "./components/MetadataTabs";
import { useNotification } from "./components/Notifications";
import { useMetadataReader } from "./hooks/useMetadataReader";
import { useSendMetadata } from "./hooks/useSendMetadata";

function App() {
    const notify = useNotification();
    const [activeTab, setActiveTab] = useState("main");
    const { fileName, metadata, handleFileUpload, setTrackMetadata } = useMetadataReader();
    const { isSending, handleSendMetadata } = useSendMetadata(metadata?.trackMetadata);

    return (
        <main className="container-fluid app-shell">
            <h1>Musiikin metadatalukija</h1>
            <FileUpload
                fileName={fileName}
                onFileSelected={handleFileUpload}
                onFileRejected={() => notify("Valitse tuettu audiotiedosto.", "danger")}
            />
            {metadata && (
                <>
                    <MetadataTabs activeTab={activeTab} onChange={setActiveTab} />
                    {activeTab === "main" && (
                        <MainMetadataView
                            cleanData={metadata.cleanData}
                            albumArt={metadata.albumArt}
                        />
                    )}
                    <div hidden={activeTab !== "metadata"}>
                        <MetadataView
                            trackMetadata={metadata.trackMetadata}
                            originalMetadata={metadata.originalMetadata}
                            onTrackMetadataChange={setTrackMetadata}
                            onSend={handleSendMetadata}
                            isSending={isSending}
                        />
                    </div>
                </>
            )}
        </main>
    );
}

export default App;
