import { cleanText } from "./metadata";

function asStringArray(value) {
    const values = Array.isArray(value) ? value : [value];
    return values
        .filter((item) => typeof item === "string")
        .map(cleanText)
        .filter(Boolean);
}

export function mapMetadataToTrack(metadata) {
    const common = metadata?.common ?? {};
    const genres = asStringArray(common.genre);
    const languages = asStringArray(common.language);
    const artists = asStringArray(common.artists?.length ? common.artists : common.artist);
    const composers = asStringArray(common.composer);
    const releaseDate = cleanText(common.date || common.originaldate || common.year);
    const trackNumber = common.track?.no;

    return {
        title: cleanText(common.title),
        duration: Number.isFinite(metadata?.format?.duration) ? metadata.format.duration : "",
        descriptions: asStringArray(common.description ?? common.comment),
        display_artists: artists,
        display_artists_aliases: [],
        display_artists_full_names: [],
        album: { title: cleanText(common.album) },
        isrc: asStringArray(common.isrc)[0] || "",
        tags: [],
        album_release_date: releaseDate,
        artists_master_ownerships: [],
        artists_publishing_ownerships: composers.map((fullName) => ({
            artist: { full_name: fullName },
            rights_type: { key: "author", type: "publishing-artist" },
            territories: []
        })),
        master_ownerships: [],
        publishing_ownerships: [],
        track_number: trackNumber ?? "",
        territories: [],
        custom: {
            genre: genres,
            languages,
            recording_country: cleanText(common.recordingcountry),
            publication_year: common.year ? String(common.year) : ""
        }
    };
}
