import { cleanText } from "./metadata";
import { getItunesComposerNames } from "./metadataMappers/itunes";

export function serializeMetadata(metadata) {
    return JSON.parse(JSON.stringify(metadata, (key, value) => {
        if (key === "data" && typeof value === "object") {
            return "Image binary data is very long so it is hidden for convenience";
        }
        return value;
    }));
}

export function getAlbumArt(metadata) {
    const picture = metadata.common?.picture?.[0];
    if (!picture) return null;

    const base64String = btoa(
        new Uint8Array(picture.data).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    return `data:${picture.format};base64,${base64String}`;
}

export function getSummaryData(parsedMetadata, fileSizeBytes) {
    const title = cleanText(parsedMetadata.common?.title) || "Tuntematon otsikko";
    const performers =
        cleanText(parsedMetadata.common?.artists?.join(", ") || parsedMetadata.common?.artist) ||
        "Tuntematon esittäjä";
    const songwriters = getItunesComposerNames(parsedMetadata);

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

    return {
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
        durationFormatted: `${minutes}:${seconds}`,
        fileSize: (fileSizeBytes / (1024 * 1024)).toFixed(2) + " MB"
    };
}
