import React, { useState, useCallback } from "react";
import { parseBlob } from "music-metadata-browser";
import { useDropzone } from "react-dropzone";
import { Buffer } from "buffer";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import { romanize } from "@romanize/korean";
import "./App.css";

window.Buffer = Buffer;

const hasHangul = (str = "") => /[\uAC00-\uD7AF]/.test(str);
const romanizeIfHangul = (str = "") => hasHangul(str) ? romanize(str, { system: "RR" }) : null;
const capitalizeFirstLetter = (str = "") =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

function App() {
    const [fileName, setFileName] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [albumArt, setAlbumArt] = useState(null);
    const [musicBrainzData, setMusicBrainzData] = useState(null);
    const [showFullJson, setShowFullJson] = useState(false);
    const [showBrainzJson, setShowBrainzJson] = useState(false);
    const [cleanData, setCleanData] = useState({
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
    });
    const [artistDetails, setArtistDetails] = useState([]);
    const [artistJsonVisibility, setArtistJsonVisibility] = useState({});

    const toggleArtistJson = (id) => {
        setArtistJsonVisibility(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const fetchMusicBrainzData = async (isrc) => {
        if (!isrc || isrc === "Unknown ISRC") return;
        try {
            const response = await fetch(`https://musicbrainz.org/ws/2/recording/?query=isrc:${isrc}&fmt=json`);
            if (!response.ok) throw new Error("Failed to fetch MusicBrainz data");
            const data = await response.json();

            setMusicBrainzData(data);

            const artistIds = [];
            data.recordings?.forEach((recording) => {
                recording["artist-credit"]?.forEach((credit) => {
                    if (credit.artist?.id) {
                        artistIds.push(credit.artist.id);
                    }
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
                    const artistData = await artistResponse.json();
                    return { ...artistData };
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
        setMusicBrainzData(null);

        try {
            const metadata = await parseBlob(file);

            const picture = metadata.common?.picture?.[0];
            if (picture) {
                const base64String = btoa(
                    new Uint8Array(picture.data).reduce((data, byte) => data + String.fromCharCode(byte), "")
                );
                const imageUrl = `data:${picture.format};base64,${base64String}`;
                setAlbumArt(imageUrl);
            }

            const title = metadata.common?.title || "Unknown title";
            const performers = metadata.common?.artists?.join(", ") || metadata.common?.artist || "Unknown performer";

            let songwriterRaw = "";
            if (metadata.native) {
                for (const format in metadata.native) {
                    for (const tag of metadata.native[format]) {
                        if (tag.id.toLowerCase() === "©wrt" && typeof tag.value === "string") {
                            songwriterRaw = tag.value;
                            break;
                        }
                    }
                    if (songwriterRaw) break;
                }
            }

            if (!songwriterRaw && metadata.common?.composer?.[0]) {
                songwriterRaw = metadata.common.composer[0];
            }

            const songwriters = songwriterRaw ? songwriterRaw.split(/,|&/).map(s => s.trim()).filter(Boolean) : [];

            let year = metadata.common?.year;
            if (!year && metadata.native) {
                for (const format in metadata.native) {
                    for (const tag of metadata.native[format]) {
                        const tagId = tag.id.toLowerCase();
                        if (tagId === "cprt" && typeof tag.value === "string") {
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
            if (!year && metadata.common?.copyright) {
                const match = metadata.common.copyright.match(/(\d{4})/);
                if (match) year = match[1];
            }
            if (!year) year = "Unknown year";

            let isrc = metadata.common?.isrc || "";
            if (!isrc && metadata.native) {
                for (const format in metadata.native) {
                    for (const tag of metadata.native[format]) {
                        const tagId = tag.id.toLowerCase();
                        if (tagId === "xid " && typeof tag.value === "string") {
                            const match = tag.value.match(/isrc:([A-Z0-9]+)/i);
                            if (match) isrc = match[1];
                        }
                        if (tagId.includes("isrc") || tagId.includes("ufid")) {
                            if (typeof tag.value === "string") isrc = tag.value;
                            else if (typeof tag.value === "object" && tag.value.identifier) isrc = tag.value.identifier;
                        }
                        if (tag.id === "----:com.apple.iTunes:ISRC" && typeof tag.value === "string") {
                            isrc = tag.value;
                        }
                    }
                }
            }
            if (!isrc) isrc = "Unknown ISRC";

            const album = metadata.common?.album || "Unknown album";
            const track = metadata.common?.track;
            const trackNumber = track?.no?.toString() || "Unknown";
            const genre = Array.isArray(metadata.common?.genre)
                ? metadata.common.genre.join(", ")
                : metadata.common?.genre || "Unknown genre";

            let label = "";
            if (metadata.native) {
                for (const format in metadata.native) {
                    for (const tag of metadata.native[format]) {
                        const tagId = tag.id.toLowerCase();
                        if (tagId === "cprt" && typeof tag.value === "string") {
                            label = tag.value.replace(/^(?:℗|©)?\s*\d{4}\s*/i, "").trim();
                            break;
                        }
                    }
                    if (label) break;
                }
            }
            if (!label && metadata.common?.label) {
                label = metadata.common.label;
            }
            if (!label && metadata.common?.copyright) {
                label = metadata.common.copyright.replace(/^(?:℗|©)?\s*\d{4}\s*/i, "").trim();
            }
            if (!label) label = "Unknown label";

            let albumId = "";
            let titleId = "";
            if (metadata.native) {
                for (const format in metadata.native) {
                    for (const tag of metadata.native[format]) {
                        const tagId = tag.id.toLowerCase();
                        if (tagId === "plid" && typeof tag.value === "number") {
                            albumId = tag.value.toString();
                        }
                        if (tagId === "cnid" && typeof tag.value === "number") {
                            titleId = tag.value.toString();
                        }
                    }
                }
            }

            const duration = metadata.format?.duration || 0;
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

            const combinedMetadata = {
                ...metadata,
                fileInfo: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }
            };

            const cleanedMetadata = JSON.parse(JSON.stringify(combinedMetadata, (key, value) => {
                if (key === "data" && typeof value === "object") {
                    return "Image binary data hidden for convenience";
                }
                return value;
            }));

            setMetadata(cleanedMetadata);
            fetchMusicBrainzData(isrc);
        } catch (error) {
            console.error("Error reading metadata:", error);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                handleFileUpload(acceptedFiles[0]);
            }
        },
        accept: "audio/*",
        multiple: false
    });

    return (
        <div className="container">
            <h1>Metatietolukija</h1>

            <div className="upload-header-row">
                <div className="album-art">
                    {albumArt ? (
                        <img src={albumArt} alt="Album Art" />
                    ) : (
                        <div className="album-art-placeholder">Ei kuvaa</div>
                    )}
                </div>

                <div className="upload-area" {...getRootProps()}>
                    <input {...getInputProps()} />
                    {isDragActive ? (
                        <p>Pudota audiotiedosto tähän...</p>
                    ) : (
                        <p>Pudota audiotiedosto tai klikkaa tästä ja valitse.</p>
                    )}
                </div>
            </div>

            {fileName && <p><strong>Tiedosto:</strong> {fileName}</p>}

            {metadata && (
                <div className="columns-wrapper">

                    {/* Left column: Yleistiedot + ArtistInfo */}
                    <div className="left-column">
                        <div className="panel clean-metadata">
                            <h2>Yleistiedot</h2>
                            {/* Left and Right inside clean panel */}
                            <div className="metadata-columns">
                                {/* Left */}
                                <div className="metadata-column">
                                    <p><strong>Kappale:</strong><br />
                                        {cleanData.titleId ? (
                                            <a href={`https://music.apple.com/song/${cleanData.titleId}`} target="_blank" rel="noopener noreferrer">
                                                {cleanData.title}
                                            </a>
                                        ) : cleanData.title}
                                        {romanizeIfHangul(cleanData.title) && (
                                            <div className="romanized">{romanizeIfHangul(cleanData.title)}</div>
                                        )}
                                        <div>{capitalizeFirstLetter(cleanData.title)}</div>
                                    </p>
                                    <div className="sub-info">
                                        <p><strong>Albumilta:</strong><br />
                                            {cleanData.albumId ? (
                                                <a href={`https://music.apple.com/album/${cleanData.albumId}`} target="_blank" rel="noopener noreferrer">
                                                    {cleanData.album}
                                                </a>
                                            ) : cleanData.album}
                                            {romanizeIfHangul(cleanData.album) && (
                                                <div className="romanized">{romanizeIfHangul(cleanData.album)}</div>
                                            )}
                                        </p>
                                    </div>
                                    <p><strong>Uranumero:</strong><br />{cleanData.trackNumber}</p>
                                    <p><strong>Levy-yhtiö:</strong><br />{cleanData.label}</p>
                                    <p><strong>Julkaisuvuosi:</strong><br />{cleanData.year}</p>
                                    <p><strong>Kesto:</strong><br />{cleanData.durationFormatted}</p>
                                    <p><strong>Tiedostokoko:</strong><br />{cleanData.fileSize}</p>
                                </div>

                                {/* Right */}
                                <div className="metadata-column">
                                    <p><strong>Esittäjät:</strong><br />
                                        {cleanData.performers
                                            ? cleanData.performers.split(/,|&/).map((name, idx) => (
                                                <div key={idx}>
                                                    {name.trim()}
                                                    {romanizeIfHangul(name) && (
                                                        <div className="romanized">{romanizeIfHangul(name)}</div>
                                                    )}
                                                </div>
                                            ))
                                            : ""}
                                    </p>

                                    <p><strong>ISRC:</strong><br />{cleanData.isrc}</p>

                                    {cleanData.songwriters.length > 0 && (
                                        <p><strong>Tekijät:</strong><br />
                                            {cleanData.songwriters.map((name, idx) => (
                                                <div key={idx}>
                                                    {name}
                                                    {romanizeIfHangul(name) && (
                                                        <div className="romanized">{romanizeIfHangul(name)}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </p>
                                    )}

                                    <p><strong>Laji:</strong><br />{cleanData.genre}</p>
                                </div>
                            </div>
                        </div>

                        {/* Artist Info */}
                        {artistDetails.length > 0 && (
                            <div>
                                <h3>MusicBrainz-metadata (esittäjät)</h3>
                                {artistDetails.map((artist) => (
                                    <div key={artist.id} className="panel artist-info">
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <h3>{artist.name}</h3>
                                            <button
                                                className="toggle-button"
                                                onClick={() => toggleArtistJson(artist.id)}
                                            >
                                                {artistJsonVisibility[artist.id] ? "Tekstinäkymä" : "JSON-näkymä"}
                                            </button>
                                        </div>
                                        {artistJsonVisibility[artist.id] ? (
                                            <JsonView
                                                src={artist}
                                                name={false}
                                                collapsed={2}
                                                displayDataTypes={false}
                                                enableClipboard={false}
                                                style={{ fontSize: "13px" }}
                                            />
                                        ) : (
                                            <pre style={{ fontSize: "13px" }}>{JSON.stringify(artist, null, 2)}</pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Full metadata panel */}
                    <div className="panel full-metadata">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Tiedoston metadata</h2>
                            <button className="toggle-button" onClick={() => setShowFullJson(prev => !prev)}>
                                {showFullJson ? "Tekstinäkymä" : "JSON-näkymä"}
                            </button>
                        </div>
                        {showFullJson ? (
                            <JsonView src={metadata} name={false} collapsed={2} displayDataTypes={false} enableClipboard={false} style={{ fontSize: '13px' }} />
                        ) : (
                            <pre>{JSON.stringify(metadata, null, 2)}</pre>
                        )}
                    </div>

                    {/* MusicBrainz recording-level data */}
                    <div className="panel musicbrainz">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>MusicBrainz-metadata</h2>
                            <button className="toggle-button" onClick={() => setShowBrainzJson(prev => !prev)}>
                                {showBrainzJson ? "Tekstinäkymä" : "JSON-näkymä"}
                            </button>
                        </div>
                        {showBrainzJson ? (
                            <JsonView src={musicBrainzData} name={false} collapsed={2} displayDataTypes={false} enableClipboard={false} style={{ fontSize: '13px' }} />
                        ) : (
                            <pre>{JSON.stringify(musicBrainzData, null, 2)}</pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
