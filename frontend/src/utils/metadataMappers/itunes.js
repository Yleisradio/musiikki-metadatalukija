import { cleanText } from "../metadata";
import { DEFAULT_AUTHOR_ROLE } from "../authorRoles";

function asStringArray(value) {
    const values = Array.isArray(value) ? value : [value];
    return values
        .filter((item) => typeof item === "string")
        .map(cleanText)
        .filter(Boolean);
}

function splitComposerNames(value) {
    return asStringArray(value)
        .flatMap((composer) => composer.split(/,|&/).map(cleanText).filter(Boolean));
}

function getNativeIsrc(metadata) {
    for (const tags of Object.values(metadata?.native ?? {})) {
        for (const tag of tags) {
            const tagId = String(tag.id ?? "").toLowerCase();
            if (tagId === "xid " && typeof tag.value === "string") {
                const match = tag.value.match(/isrc:([A-Z0-9]+)/i);
                if (match) return match[1];
            }
            if (tagId.includes("isrc") || tagId.includes("ufid")) {
                if (typeof tag.value === "string") return cleanText(tag.value);
                if (typeof tag.value?.identifier === "string") return cleanText(tag.value.identifier);
            }
        }
    }
    return "";
}

export function getItunesComposerNames(metadata) {
    const composerValues = splitComposerNames(metadata?.common?.composer);
    if (composerValues.length) return composerValues;

    for (const tags of Object.values(metadata?.native ?? {})) {
        for (const tag of tags) {
            if (String(tag.id ?? "").toLowerCase() === "©wrt" && typeof tag.value === "string") {
                return splitComposerNames(tag.value);
            }
        }
    }
    return [];
}

function getLabel(metadata) {
    const commonLabel = cleanText(metadata?.common?.label);
    if (commonLabel) return commonLabel;

    for (const tags of Object.values(metadata?.native ?? {})) {
        for (const tag of tags) {
            if (String(tag.id ?? "").toLowerCase() === "cprt" && typeof tag.value === "string") {
                const label = cleanText(tag.value.replace(/^(?:℗|©)?\s*\d{4}\s*/i, ""));
                if (label) return label;
            }
        }
    }
    return "";
}

function getTrackNumber(value) {
    const trackNumber = value?.no;
    if (typeof trackNumber === "number") return trackNumber;
    if (typeof trackNumber === "string" && trackNumber.trim() !== "") {
        const parsed = Number(trackNumber);
        if (Number.isFinite(parsed)) return parsed;
    }
    return "";
}

export function canMapItunesMetadata(metadata) {
    return Object.values(metadata?.native ?? {}).some((tags) =>
        tags.some(({ id = "" }) =>
            /com\.apple\.itunes/i.test(id) || /^(cnid|plid)$/i.test(id)
        )
    );
}

export function mapItunesMetadataToTrack(metadata) {
    const common = metadata?.common ?? {};
    const artists = asStringArray(common.artists?.length ? common.artists : common.artist);
    const composers = getItunesComposerNames(metadata);
    const artistName = artists.join(", ");

    return {
        tracks: [{
            title: cleanText(common.title),
            isrc: asStringArray(common.isrc)[0] || getNativeIsrc(metadata),
            track_number: getTrackNumber(common.track),
            artists_master_ownerships: [{
                artist: { full_name: artistName }
            }],
            artists_publishing_ownerships: composers.map((composer) => ({
                artist: { full_name: composer },
                rights_type: { key: DEFAULT_AUTHOR_ROLE }
            })),
            custom: {
                CustomID: "",
                finnish_content: false,
                yle_master: false
            },
            album: {
                title: "",
                artists_master_ownerships: [{
                    artist: { full_name: artistName }
                }],
                master_ownerships: [{
                    label: { label_name: getLabel(metadata) }
                }],
                album_ref: "Ei kataloginumeroa",
                custom: {
                    CustomID: "",
                    finnish_content: false,
                    yle_master: false
                }
            }
        }]
    };
}
