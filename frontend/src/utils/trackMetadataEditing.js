export function getValue(value, path) {
    return path.reduce((current, key) => current?.[key], value);
}

function updateTrackValue(track, path, nextValue) {
    const [key, ...remainingPath] = path;
    const updated = Array.isArray(track) ? [...track] : { ...track };

    updated[key] = remainingPath.length
        ? updateTrackValue(track[key], remainingPath, nextValue)
        : nextValue;

    return updated;
}

export function hasTrackNumber(value) {
    return value !== "" && value != null && Number.isFinite(Number(value));
}

function makeTrackCatalogNumber(albumCatalogNumber, trackNumber) {
    if (!albumCatalogNumber || !hasTrackNumber(trackNumber)) return "";
    const number = Number(trackNumber);
    return `${albumCatalogNumber}-${number < 10 ? `0${number}` : number}`;
}

export function updateMetadataField(metadata, path, value, {
    mirrorPath,
    updateTrackCatalogNumber = false
} = {}) {
    let updated = updateTrackValue(metadata, path, value);
    if (mirrorPath) updated = updateTrackValue(updated, mirrorPath, value);

    if (updateTrackCatalogNumber) {
        const trackNumberPath = ["tracks", 0, "track_number"];
        const previousTrackNumber = getValue(metadata, trackNumberPath);
        const nextTrackNumber = getValue(updated, trackNumberPath);
        const albumCatalogNumber = getValue(updated, ["tracks", 0, "album", "custom", "CustomID"]);
        if (hasTrackNumber(nextTrackNumber) || hasTrackNumber(previousTrackNumber)) {
            updated = updateTrackValue(
                updated,
                ["tracks", 0, "custom", "CustomID"],
                makeTrackCatalogNumber(albumCatalogNumber, nextTrackNumber)
            );
        }
    }

    return updated;
}
