import React, { useCallback, useState } from "react";
import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import "react18-json-view/src/style.css";
import "./App.css";
import FileUpload from "./components/FileUpload";
import JsonMetadataPanel from "./components/JsonMetadataPanel";
import MainMetadataView from "./components/MainMetadataView";
import MetadataView from "./components/MetadataView";
import MetadataTabs from "./components/MetadataTabs";
import MusicBrainzView from "./components/MusicBrainzView";
import { cleanText } from "./utils/metadata";

window.Buffer = Buffer;

function serializeMetadata(metadata) {
    return JSON.parse(JSON.stringify(metadata, (key, value) => {
        if (key === "data" && typeof value === "object") {
            return "Image binary data is very long so it is hidden for convenience /Teemu";
        }
        return value;
    }));
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
    const [fileName, setFileName] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [originalMetadata, setOriginalMetadata] = useState(null);
    const [albumArt, setAlbumArt] = useState(null);
    const [musicBrainzData, setMusicBrainzData] = useState(null);
    const [activeTab, setActiveTab] = useState("main");
    const [cleanData, setCleanData] = useState(initialCleanData);
    const [artistDetails, setArtistDetails] = useState([]);

    const fetchMusicBrainzData = async (isrc) => {
        if (!isrc || isrc === "Tuntematon ISRC") return;
        try {
            const response = await fetch(`https://musicbrainz.org/ws/2/recording/?query=isrc:${isrc}&fmt=json`);
            if (!response.ok) throw new Error("Failed to fetch MusicBrainz data");
            const data = await response.json();

            setMusicBrainzData(data);

            const artistIds = [];
            data.recordings?.forEach((recording) => {
                recording["artist-credit"]?.forEach((credit) => {
                    if (credit.artist?.id) artistIds.push(credit.artist.id);
                });
            });
            const uniqueArtistIds = [...new Set(artistIds)];
            const fetchedArtists = await Promise.all(
                uniqueArtistIds.map(async (artistId) => {
                    const artistResponse = await fetch(
                        `https://musicbrainz.org/ws/2/artist/${artistId}?fmt=json&inc=aliases+tags+ratings+url-rels+artist-rels`
                    );
                    if (!artistResponse.ok) {
                        console.error(`Failed to fetch artist data for ${artistId}`);
                        return { id: artistId, error: "Fetch failed" };
                    }
                    return artistResponse.json();
                })
            );
            setArtistDetails(fetchedArtists);
        } catch (error) {
            console.error("MusicBrainz fetch error:", error);
            setMusicBrainzData({ error: "No data found or failed to fetch." });
            setArtistDetails([]);
        }
    };

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        setFileName(file.name);
        setAlbumArt(null);
        setMetadata(null);
        setOriginalMetadata(null);
        setMusicBrainzData(null);
        setArtistDetails([]);

        try {
            const parsedMetadata = await parseBlob(file);
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

            setOriginalMetadata(serializeMetadata(parsedMetadata));

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
            fetchMusicBrainzData(isrc);
        } catch (error) {
            console.error("Error reading metadata:", error);
        }
    }, []);

    return (
        <main className="container-fluid app-shell">
            <h1>Musiikin metatietolukija</h1>
            <FileUpload fileName={fileName} imageUrl={albumArt} onFileSelected={handleFileUpload} />
            {metadata && (
                <>
                    <MetadataTabs activeTab={activeTab} onChange={setActiveTab} />
                    {activeTab === "main" ? (
                        <MainMetadataView
                            cleanData={cleanData}
                            artistDetails={artistDetails}
                        />
                    ) : activeTab === "metadata" ? (
                        <MetadataView metadata={metadata} onMetadataChange={setMetadata} />
                    ) : activeTab === "original" ? (
                        <div className="row g-4 text-start align-items-start">
                            <div className="col-12">
                                <JsonMetadataPanel title="Alkuperäinen metadata" data={originalMetadata} />
                            </div>
                        </div>
                    ) : (
                        <MusicBrainzView data={musicBrainzData} artistDetails={artistDetails} />
                    )}
                </>
            )}
        </main>
    );
}

export default App;
