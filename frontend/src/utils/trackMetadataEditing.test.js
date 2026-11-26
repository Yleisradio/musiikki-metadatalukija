import { getValue, hasTrackNumber, updateMetadataField } from "./trackMetadataEditing";

function createMetadata(trackNumber = 3) {
    return {
        tracks: [{
            title: "Original",
            track_number: trackNumber,
            custom: { CustomID: "MANUAL", finnish_content: false },
            artists_master_ownerships: [{ artist: { full_name: "Artist" } }],
            artists_publishing_ownerships: [
                { artist: { full_name: "Writer" }, rights_type: { key: "author" } }
            ],
            album: {
                custom: { CustomID: "ALBUM", finnish_content: false },
                artists_master_ownerships: [{ artist: { full_name: "Artist" } }]
            }
        }]
    };
}

function deepFreeze(value) {
    Object.values(value).forEach((child) => {
        if (child && typeof child === "object") deepFreeze(child);
    });
    return Object.freeze(value);
}

test("reads nested array paths and returns undefined for missing values", () => {
    const metadata = createMetadata();
    expect(getValue(metadata, ["tracks", 0, "title"])).toBe("Original");
    expect(getValue(metadata, ["tracks", 1, "title"])).toBeUndefined();
});

test.each([
    ["", false], [null, false], [undefined, false], ["invalid", false],
    [NaN, false], [Infinity, false], [0, true], [3, true], ["10", true]
])("recognizes the existing track-number value %s as %s", (value, expected) => {
    expect(hasTrackNumber(value)).toBe(expected);
});

test("updates a nested array immutably without replacing unaffected branches", () => {
    const metadata = deepFreeze(createMetadata());
    const updated = updateMetadataField(metadata,
        ["tracks", 0, "artists_publishing_ownerships", 0, "artist", "full_name"], "New writer");
    expect(updated.tracks[0].artists_publishing_ownerships[0].artist.full_name).toBe("New writer");
    expect(metadata.tracks[0].artists_publishing_ownerships[0].artist.full_name).toBe("Writer");
    expect(Array.isArray(updated.tracks)).toBe(true);
    expect(Array.isArray(updated.tracks[0].artists_publishing_ownerships)).toBe(true);
    expect(updated.tracks[0].album).toBe(metadata.tracks[0].album);
});

test.each([
    [
        ["artists_master_ownerships", 0, "artist", "full_name"],
        ["album", "artists_master_ownerships", 0, "artist", "full_name"],
        "New artist"
    ],
    [["custom", "finnish_content"], ["album", "custom", "finnish_content"], true]
])("mirrors the edited %s value onto the album", (path, mirrorPath, value) => {
    const metadata = deepFreeze(createMetadata());
    const updated = updateMetadataField(metadata, ["tracks", 0, ...path], value, {
        mirrorPath: ["tracks", 0, ...mirrorPath]
    });
    expect(getValue(updated, ["tracks", 0, ...path])).toBe(value);
    expect(getValue(updated, ["tracks", 0, ...mirrorPath])).toBe(value);
    expect(getValue(metadata, ["tracks", 0, ...path])).not.toBe(value);
    expect(getValue(metadata, ["tracks", 0, ...mirrorPath])).not.toBe(value);
});

test.each([
    [3, "NEW", "NEW-03"],
    [10, "NEW", "NEW-10"],
    [0, "NEW", "NEW-00"],
    [3, "", ""],
    ["", "NEW", "MANUAL"]
])("updates the album catalog number with track number %s", (trackNumber, albumId, expected) => {
    const metadata = deepFreeze(createMetadata(trackNumber));
    const updated = updateMetadataField(metadata, ["tracks", 0, "album", "custom", "CustomID"], albumId, {
        updateTrackCatalogNumber: true
    });
    expect(updated.tracks[0].album.custom.CustomID).toBe(albumId);
    expect(updated.tracks[0].custom.CustomID).toBe(expected);
    expect(updated.tracks[0].track_number).toBe(trackNumber);
    expect(metadata.tracks[0].custom.CustomID).toBe("MANUAL");
});

test.each([[9, "ALBUM-09"], [10, "ALBUM-10"], ["", ""]])(
    "recalculates the track catalog number when the track number changes to %s",
    (trackNumber, expected) => {
        const metadata = deepFreeze(createMetadata());
        const updated = updateMetadataField(metadata, ["tracks", 0, "track_number"], trackNumber, {
            updateTrackCatalogNumber: true
        });
        expect(updated.tracks[0].custom.CustomID).toBe(expected);
        expect(updated.tracks[0].track_number).toBe(trackNumber);
        expect(metadata.tracks[0].track_number).toBe(3);
    }
);

test("clears a manual track ID when a track number is entered without an album ID", () => {
    const metadata = createMetadata("");
    metadata.tracks[0].album.custom.CustomID = "";
    const updated = updateMetadataField(deepFreeze(metadata), ["tracks", 0, "track_number"], 1, {
        updateTrackCatalogNumber: true
    });
    expect(updated.tracks[0].custom.CustomID).toBe("");
});
