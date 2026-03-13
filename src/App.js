import React, { useState, useCallback } from "react";
import { parseBlob } from "music-metadata-browser";
import { useDropzone } from "react-dropzone";
import { Buffer } from "buffer";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import "./App.css";

window.Buffer = Buffer;

const capitalizeFirstLetter = (str = "") =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const normalizeNFC = (s = "") => (s ?? "").toString().normalize("NFC");
const cleanText = (s = "") => normalizeNFC(s).trim();
const formatFinnishDate = (dateStr = "") => {
    if (!dateStr) return "";

    const parts = dateStr.split("-");

    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${Number(day)}.${Number(month)}.${year}`;
    }

    if (parts.length === 2) {
        const [year, month] = parts;
        return `${Number(month)}.${year}`;
    }

    return dateStr;
};

function App() {
    const [fileName, setFileName] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [albumArt, setAlbumArt] = useState(null);
    const [musicBrainzData, setMusicBrainzData] = useState(null);
    const [showFullJson, setShowFullJson] = useState(false);
    const [showBrainzJson, setShowBrainzJson] = useState(false);
    const [activeTab, setActiveTab] = useState("main");
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

    const getAliasByType = (artist, aliasType) => {
        if (!artist?.aliases?.length) return null;
        return artist.aliases.find(alias => alias.type === aliasType);
    };

    const getRelationValues = (artist, relationType) => {
        if (!artist?.relations?.length) return [];
        return artist.relations
            .filter(rel => rel.type === relationType && rel.artist?.name)
            .map(rel => rel.artist.name);
    };

    const getCurrentMembers = (artist) => {
        if (!artist?.relations?.length) return [];
        return artist.relations
            .filter(rel =>
                rel.type === "member of band" &&
                rel.artist?.name &&
                rel.direction === "backward" &&
                rel.ended === false
            )
            .map(rel => {
                const roles = rel.attributes?.filter(attr => attr !== "original") || [];
                return {
                    name: rel["target-credit"] || rel.artist.name,
                    roles,
                    original: rel.attributes?.includes("original")
                };
            });
    };

    const getFormerMembers = (artist) => {
        if (!artist?.relations?.length) return [];
        return artist.relations
            .filter(rel =>
                rel.type === "member of band" &&
                rel.artist?.name &&
                rel.direction === "backward" &&
                rel.ended === true
            )
            .map(rel => {
                const roles = rel.attributes?.filter(attr => attr !== "original") || [];
                return {
                    name: rel["target-credit"] || rel.artist.name,
                    roles,
                    original: rel.attributes?.includes("original"),
                    begin: rel.begin || "",
                    end: rel.end || ""
                };
            });
    };

    const getMemberOfBands = (artist) => {
        if (!artist?.relations?.length) return [];

        const bands = artist.relations
            .filter(rel =>
                rel.type === "member of band" &&
                rel.artist?.name &&
                rel.direction === "forward"
            )
            .map(rel => rel.artist.name);

        return dedupeValues(bands);
    };

    const getAliasesByType = (artist, aliasType) => {
        if (!artist?.aliases?.length) return [];

        const aliases = artist.aliases
            .filter(alias => alias.type === aliasType && alias.name)
            .map(alias => alias.name);

        return dedupeValues(aliases, artist.name);
    };

    const dedupeValues = (items = [], excludeValue = "") => {
        const normalizedExclude = cleanText(excludeValue).toLowerCase();
        const seen = new Set();

        return items.filter((item) => {
            const cleaned = cleanText(item);
            const key = cleaned.toLowerCase();

            if (!cleaned) return false;
            if (key === normalizedExclude) return false;
            if (seen.has(key)) return false;

            seen.add(key);
            return true;
        });
    };

    const getMeaningfulSearchHints = (artist) => {
        if (!artist?.aliases?.length) return [];

        const hints = artist.aliases
            .filter(alias =>
                alias.type === "Search hint" &&
                alias.name &&
                alias.name.trim().length > 1 &&
                !alias.name.toLowerCase().includes("vevo") &&
                !alias.name.toLowerCase().includes("channel")
            )
            .map(alias => alias.name);

        return dedupeValues(hints, artist.name);
    };

    const renderListValue = (items) => {
        if (!items || items.length === 0) return <div> </div>;

        return (
            <div className="relation-list">
                {items.map((item, idx) => (
                    <div key={idx} className="relation-item">
                        <span className="relation-bullet">•</span>
                        <span>{item}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderMemberList = (members) => {
        if (!members || members.length === 0) return <div> </div>;

        return (
            <div className="relation-list">
                {members.map((member, idx) => (
                    <div key={idx} className="relation-item">
                        <span className="relation-bullet">•</span>
                        <span>
                            {member.name}
                            {member.roles.length > 0 && ` (${member.roles.join(", ")})`}
                            {member.original ? " [original]" : ""}
                            {member.begin || member.end ? ` — ${member.begin || "?"}–${member.end || "?"}` : ""}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderArtistMetadataPanel = (artist) => {
        const legalNameAliases = getAliasesByType(artist, "Legal name");
        const artistNameAliases = getAliasesByType(artist, "Artist name");
        const searchHintAliases = getMeaningfulSearchHints(artist);
        const currentMembers = getCurrentMembers(artist);
        const formerMembers = getFormerMembers(artist).slice(0, 8);
        const memberOfBands = getMemberOfBands(artist);
        const founders = getRelationValues(artist, "founder");
        const subgroups = getRelationValues(artist, "subgroup");
        const isGroup = artist.type === "Group";
        const isPerson = artist.type === "Person";

        const beginLabel = isGroup ? "Perustettu" : isPerson ? "Syntynyt" : "Syntynyt/Perustettu";
        const endLabel = isGroup ? "Lakkautettu" : isPerson ? "Kuollut" : "Kuollut/Lakkautettu";

        return (
            <div className="panel artist-metadata-clean">
                <h2>Esittäjän lisätiedot</h2>

                <div className="artist-metadata-columns">
                    <div className="artist-metadata-column">
                        <p><strong>Nimi:</strong><br />{artist.name || ""}</p>

                        {artist.type && (
                            <p><strong>Tyyppi:</strong><br />{artist.type}</p>
                        )}

                        {artist["life-span"]?.begin && (
                            <p><strong>{beginLabel}:</strong><br />{formatFinnishDate(artist["life-span"].begin)}</p>
                        )}

                        {artist["life-span"]?.end && (
                            <p><strong>{endLabel}:</strong><br />{formatFinnishDate(artist["life-span"].end)}</p>
                        )}

                        {artist.gender && artist.type === "Person" && (
                            <p><strong>Sukupuoli:</strong><br />{artist.gender}</p>
                        )}

                        {legalNameAliases.length > 0 && (
                            <p><strong>Oikea (koko) nimi:</strong><br />{renderListValue(legalNameAliases)}</p>
                        )}

                        {artistNameAliases.length > 0 && (
                            <p><strong>Alias:</strong><br />{renderListValue(artistNameAliases)}</p>
                        )}

                        {searchHintAliases.length > 0 && (
                            <p><strong>Tunnetaan myös nimellä:</strong><br />{renderListValue(searchHintAliases)}</p>
                        )}

                    </div>

                    <div className="artist-metadata-column">
                        {/*{artist.country && (*/}
                        {/*    <p><strong>Maatunnus:</strong><br />{artist.country}</p>*/}
                        {/*)}*/}

                        {artist.area?.name && (
                            <p><strong>Asuinalue:</strong><br />{artist.area.name}</p>
                        )}

                        {artist["begin-area"]?.name && (
                            <p><strong>Kotoisin:</strong><br />{artist["begin-area"].name}</p>
                        )}

                        {artist.disambiguation && (
                            <p><strong>Täsmennys:</strong><br />{artist.disambiguation}</p>
                        )}

                        {artist.type === "Group" && currentMembers.length > 0 && (
                            <p><strong>Yhtyeen jäsen (tällä hetkellä):</strong><br />{renderMemberList(currentMembers)}</p>
                        )}

                        {artist.type === "Group" && formerMembers.length > 0 && (
                            <p><strong>Yhtyeen jäsen (entinen):</strong><br />{renderMemberList(formerMembers)}</p>
                        )}

                        {artist.type === "Group" && founders.length > 0 && (
                            <p><strong>Perustaja:</strong><br />{renderListValue(founders)}</p>
                        )}

                        {artist.type === "Group" && subgroups.length > 0 && (
                            <p><strong>Muut projektit:</strong><br />{renderListValue(subgroups)}</p>
                        )}

                        {artist.type === "Person" && memberOfBands.length > 0 && (
                            <p><strong>Yhtyeen jäsen:</strong><br />{renderListValue(memberOfBands)}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

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
        setArtistDetails([]);

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

            const title = cleanText(metadata.common?.title) || "Tuntematon otsikko";
            const performers =
                cleanText(metadata.common?.artists?.join(", ") || metadata.common?.artist) || "Tuntematon esittäjä";

            let songwriterRaw = "";
            if (metadata.native) {
                for (const format in metadata.native) {
                    for (const tag of metadata.native[format]) {
                        if (tag.id.toLowerCase() === "©wrt" && typeof tag.value === "string") {
                            songwriterRaw = cleanText(tag.value);
                            break;
                        }
                    }
                    if (songwriterRaw) break;
                }
            }

            if (!songwriterRaw && metadata.common?.composer?.[0]) {
                songwriterRaw = cleanText(metadata.common.composer[0]);
            }

            const songwriters = songwriterRaw
                ? songwriterRaw
                    .split(/,|&/)
                    .map(s => cleanText(s))
                    .filter(Boolean)
                : [];

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
            if (!year) year = "Tuntematon vuosi";

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
            if (!isrc) isrc = "Tuntematon ISRC";

            const album = cleanText(metadata.common?.album) || "Tuntematon albumi";
            const track = metadata.common?.track;
            const trackNumber = track?.no?.toString() || "Tuntematon";
            const genre = Array.isArray(metadata.common?.genre)
                ? metadata.common.genre.join(", ")
                : metadata.common?.genre || "Tuntematon genre";

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
            if (!label) label = "Tuntematon levymerkki";
            label = cleanText(label);

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
                    return "Image binary data is very long so it is hidden for convenience /Teemu";
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
                <div className="tab-buttons">
                    <button
                        className={activeTab === "main" ? "active" : ""}
                        onClick={() => setActiveTab("main")}
                    >
                        Perusnäkymä
                    </button>
                    <button
                        className={activeTab === "musicbrainz" ? "active" : ""}
                        onClick={() => setActiveTab("musicbrainz")}
                    >
                        MusicBrainz-näkymä
                    </button>
                </div>
            )}

            {metadata && (
                <>
                    {activeTab === "main" && (
                        <div className="main-layout-three-columns">
                            <div className="panel clean-metadata">
                                <h2>Yleistiedot</h2>
                                <div className="metadata-columns">
                                    <div className="metadata-column">
                                        <p><strong>Kappale:</strong><br />
                                            {cleanData.titleId ? (
                                                <a href={`https://music.apple.com/song/${cleanData.titleId}`} target="_blank" rel="noopener noreferrer">
                                                    {cleanData.title}
                                                </a>
                                            ) : cleanData.title}
                                            <div>{capitalizeFirstLetter(cleanData.title)}</div>
                                        </p>

                                        <div className="sub-info">
                                            <p><strong>Albumilta:</strong><br />
                                                {cleanData.albumId ? (
                                                    <a href={`https://music.apple.com/album/${cleanData.albumId}`} target="_blank" rel="noopener noreferrer">
                                                        {cleanData.album}
                                                    </a>
                                                ) : cleanData.album}
                                            </p>
                                        </div>

                                        <p><strong>Uranumero:</strong><br />{cleanData.trackNumber}</p>
                                        <p><strong>Levy-yhtiö:</strong><br />{cleanData.label}</p>
                                        <p><strong>Julkaisuvuosi:</strong><br />{cleanData.year}</p>
                                        <p><strong>Kesto:</strong><br />{cleanData.durationFormatted}</p>
                                        <p><strong>Tiedostokoko:</strong><br />{cleanData.fileSize}</p>
                                    </div>

                                    <div className="metadata-column">
                                        <p><strong>Esittäjät:</strong><br />
                                            {cleanData.performers
                                                ? renderListValue(
                                                    cleanData.performers
                                                        .split(/,|&/)
                                                        .map(name => name.trim())
                                                        .filter(Boolean)
                                                )
                                                : ""}
                                        </p>

                                        <p><strong>ISRC:</strong><br />{cleanData.isrc}</p>

                                        {cleanData.songwriters.length > 0 && (
                                            <p><strong>Tekijät:</strong><br />
                                                {renderListValue(cleanData.songwriters)}
                                            </p>
                                        )}

                                        <p><strong>Laji:</strong><br />{cleanData.genre}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="artist-summary-column">
                                {artistDetails.length > 0 ? (
                                    artistDetails.map((artist) => (
                                        <div key={artist.id}>
                                            {renderArtistMetadataPanel(artist)}
                                        </div>
                                    ))
                                ) : (
                                    <div className="panel artist-metadata-clean">
                                        <h2>Esittäjän lisätiedot</h2>
                                    </div>
                                )}
                            </div>

                            <div className="panel full-metadata">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h2>Tiedoston metadata</h2>
                                    <button className="toggle-button" onClick={() => setShowFullJson(prev => !prev)}>
                                        {showFullJson ? "Tekstinäkymä" : "JSON-näkymä"}
                                    </button>
                                </div>
                                {showFullJson ? (
                                    <JsonView
                                        src={metadata}
                                        name={false}
                                        collapsed={2}
                                        displayDataTypes={false}
                                        enableClipboard={false}
                                        style={{ fontSize: "13px" }}
                                    />
                                ) : (
                                    <pre>{JSON.stringify(metadata, null, 2)}</pre>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "musicbrainz" && (
                        <div className="page-layout">
                            <div className="bottom-row">
                                <div className="panel musicbrainz">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <h2>Teoksen MusicBrainz-metadata</h2>
                                        <button className="toggle-button" onClick={() => setShowBrainzJson(prev => !prev)}>
                                            {showBrainzJson ? "Tekstinäkymä" : "JSON-näkymä"}
                                        </button>
                                    </div>
                                    {showBrainzJson ? (
                                        <JsonView
                                            src={musicBrainzData}
                                            name={false}
                                            collapsed={2}
                                            displayDataTypes={false}
                                            enableClipboard={false}
                                            style={{ fontSize: "13px" }}
                                        />
                                    ) : (
                                        <pre>{JSON.stringify(musicBrainzData, null, 2)}</pre>
                                    )}
                                </div>

                                {artistDetails.length > 0 && (
                                    <div className="artist-raw-column">
                                        {artistDetails.map((artist) => (
                                            <div key={artist.id} className="panel artist-info">
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <div>
                                                        <h2>Esittäjän MusicBrainz-metadata</h2>
                                                        <h3>{artist.name}</h3>
                                                    </div>
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
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default App;