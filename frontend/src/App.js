import React, { useCallback, useState } from "react";
import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import "./App.css";
import FileUpload from "./components/FileUpload";
import MainMetadataView from "./components/MainMetadataView";
import MetadataView from "./components/MetadataView";
import MetadataTabs from "./components/MetadataTabs";
import { useNotification } from "./components/Notifications";
import { cleanText } from "./utils/metadata";
import { mapMetadataToTrack } from "./utils/trackMetadata";

window.Buffer = Buffer;

function serializeMetadata(metadata) {
    return JSON.parse(JSON.stringify(metadata, (key, value) => {
        if (key === "data" && typeof value === "object") {
            return "Image binary data is very long so it is hidden for convenience";
        }
        return value;
    }));
}

function hasItunesMetadata(metadata) {
    return Object.values(metadata.native ?? {}).some((tags) =>
        tags.some(({ id = "" }) =>
            /com\.apple\.itunes/i.test(id) || /^(cnid|plid)$/i.test(id)
        )
    );
}

const initialCleanData = {
    title: "",
    titleId: "",
    performers: "",
    songwriters: [],
    year: "",
    isrc: "",
    album: "",
    albumId: "",
    trackNumber: "",
    genre: "",
    label: "",
    durationFormatted: "",
    fileSize: ""
};

function App() {
    const notify = useNotification();
    const [fileName, setFileName] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [originalMetadata, setOriginalMetadata] = useState(null);
    const [trackMetadata, setTrackMetadata] = useState(null);
    const [albumArt, setAlbumArt] = useState(null);
    const [activeTab, setActiveTab] = useState("main");
    const [cleanData, setCleanData] = useState(initialCleanData);

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        setFileName(file.name);
        setAlbumArt(null);
        setMetadata(null);
        setOriginalMetadata(null);
        setTrackMetadata(null);
        setCleanData(initialCleanData);

        try {
            const parsedMetadata = await parseBlob(file);
            if (!hasItunesMetadata(parsedMetadata)) {
                notify("Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja.", "danger");
                return;
            }

            const picture = parsedMetadata.common?.picture?.[0];
            if (picture) {
                const base64String = btoa(
                    new Uint8Array(picture.data).reduce((data, byte) => data + String.fromCharCode(byte), "")
                );
                setAlbumArt(`data:${picture.format};base64,${base64String}`);
            }

            const title = cleanText(parsedMetadata.common?.title) || "Tuntematon otsikko";
            const performers =
                cleanText(parsedMetadata.common?.artists?.join(", ") || parsedMetadata.common?.artist) ||
                "Tuntematon esittäjä";

            let songwriterRaw = "";
            if (parsedMetadata.native) {
                for (const format in parsedMetadata.native) {
                    for (const tag of parsedMetadata.native[format]) {
                        if (tag.id.toLowerCase() === "©wrt" && typeof tag.value === "string") {
                            songwriterRaw = cleanText(tag.value);
                            break;
                        }
                    }
                    if (songwriterRaw) break;
                }
            }
            if (!songwriterRaw && parsedMetadata.common?.composer?.[0]) {
                songwriterRaw = cleanText(parsedMetadata.common.composer[0]);
            }
            const songwriters = songwriterRaw
                ? songwriterRaw.split(/,|&/).map((writer) => cleanText(writer)).filter(Boolean)
                : [];

            let year = parsedMetadata.common?.year;
            if (!year && parsedMetadata.native) {
                for (const format in parsedMetadata.native) {
                    for (const tag of parsedMetadata.native[format]) {
                        if (tag.id.toLowerCase() === "cprt" && typeof tag.value === "string") {
                            const match = tag.value.match(/(\d{4})/);
                            if (match) {
                                year = match[1];
                                break;
                            }
                        }
                    }
                    if (year) break;
                }
            }
            if (!year && parsedMetadata.common?.copyright) {
                const match = parsedMetadata.common.copyright.match(/(\d{4})/);
                if (match) year = match[1];
            }
            if (!year) year = "Tuntematon vuosi";

            let isrc = parsedMetadata.common?.isrc || "";
            if (!isrc && parsedMetadata.native) {
                for (const format in parsedMetadata.native) {
                    for (const tag of parsedMetadata.native[format]) {
                        const tagId = tag.id.toLowerCase();
                        if (tagId === "xid " && typeof tag.value === "string") {
                            const match = tag.value.match(/isrc:([A-Z0-9]+)/i);
                            if (match) isrc = match[1];
                        }
                        if (tagId.includes("isrc") || tagId.includes("ufid")) {
                            if (typeof tag.value === "string") isrc = tag.value;
                            else if (typeof tag.value === "object" && tag.value.identifier) {
                                isrc = tag.value.identifier;
                            }
                        }
                        if (tag.id === "----:com.apple.iTunes:ISRC" && typeof tag.value === "string") {
                            isrc = tag.value;
                        }
                    }
                }
            }
            if (!isrc) isrc = "Tuntematon ISRC";

            const album = cleanText(parsedMetadata.common?.album) || "Tuntematon albumi";
            const trackNumber = parsedMetadata.common?.track?.no?.toString() || "Tuntematon";
            const genre = Array.isArray(parsedMetadata.common?.genre)
                ? parsedMetadata.common.genre.join(", ")
                : parsedMetadata.common?.genre || "Tuntematon genre";

            let label = "";
            if (parsedMetadata.native) {
                for (const format in parsedMetadata.native) {
                    for (const tag of parsedMetadata.native[format]) {
                        if (tag.id.toLowerCase() === "cprt" && typeof tag.value === "string") {
                            label = tag.value.replace(/^(?:℗|©)?\s*\d{4}\s*/i, "").trim();
                            break;
                        }
                    }
                    if (label) break;
                }
            }
            if (!label && parsedMetadata.common?.label) label = parsedMetadata.common.label;
            if (!label && parsedMetadata.common?.copyright) {
                label = parsedMetadata.common.copyright.replace(/^(?:℗|©)?\s*\d{4}\s*/i, "").trim();
            }
            if (!label) label = "Tuntematon levymerkki";
            label = cleanText(label);

            let albumId = "";
            let titleId = "";
            if (parsedMetadata.native) {
                for (const format in parsedMetadata.native) {
                    for (const tag of parsedMetadata.native[format]) {
                        const tagId = tag.id.toLowerCase();
                        if (tagId === "plid" && typeof tag.value === "number") albumId = tag.value.toString();
                        if (tagId === "cnid" && typeof tag.value === "number") titleId = tag.value.toString();
                    }
                }
            }

            const duration = parsedMetadata.format?.duration || 0;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.round(duration % 60).toString().padStart(2, "0");
            const durationFormatted = `${minutes}:${seconds}`;
            const fileSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";

            setCleanData({
                title,
                titleId,
                performers,
                songwriters,
                year,
                isrc,
                album,
                albumId,
                trackNumber,
                genre,
                label,
                durationFormatted,
                fileSize
            });

            const serializedMetadata = serializeMetadata(parsedMetadata);
            setOriginalMetadata(serializedMetadata);
            setTrackMetadata(mapMetadataToTrack(serializedMetadata));

            const combinedMetadata = {
                ...parsedMetadata,
                fileInfo: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }
            };
            setMetadata(serializeMetadata(combinedMetadata));
        } catch (error) {
            console.error("Error reading metadata:", error);
            notify("Tiedoston metatietoja ei voitu lukea. Tarkista tiedosto ja yritä uudelleen.", "danger");
        }
    }, [notify]);

    return (
        <main className="container-fluid app-shell">
            <h1>Musiikin metatietolukija</h1>
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
                            cleanData={cleanData}
                            albumArt={albumArt}
                        />
                    )}
                    <div hidden={activeTab !== "metadata"}>
                        <MetadataView
                            trackMetadata={trackMetadata}
                            originalMetadata={originalMetadata}
                            onTrackMetadataChange={setTrackMetadata}
                        />
                    </div>
                </>
            )}
        </main>
    );
}

export default App;
