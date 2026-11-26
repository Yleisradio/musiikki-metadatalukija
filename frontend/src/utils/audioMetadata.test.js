import { getAlbumArt, getSummaryData, serializeMetadata } from "./audioMetadata";
import { mapItunesMetadataToTrack } from "./metadataMappers/itunes";

test("provides the existing defaults for missing summary metadata", () => {
    expect(getSummaryData({}, 0)).toEqual({
        title: "Tuntematon otsikko",
        titleId: "",
        performers: "Tuntematon esittäjä",
        songwriters: [],
        year: "Tuntematon vuosi",
        isrc: "Tuntematon ISRC",
        album: "Tuntematon albumi",
        albumId: "",
        trackNumber: "Tuntematon",
        genre: "Tuntematon genre",
        label: "Tuntematon levymerkki",
        durationFormatted: "0:00",
        fileSize: "0.00 MB"
    });
});

test("normalizes summary text and formats file, duration and Apple Music values", () => {
    expect(getSummaryData({
        common: {
            title: "  A\u0308a\u0308ni  ",
            artists: ["One", "Two"],
            artist: "Ignored",
            composer: ["Writer One & Writer Two"],
            album: " Album ",
            track: { no: 3 },
            genre: ["Rock", "Pop"],
            year: 2000,
            isrc: ["COMMON123456"],
            label: " Label "
        },
        native: { mp4: [{ id: "cnID", value: 12 }, { id: "plID", value: 34 }] },
        format: { duration: 125 }
    }, 1572864)).toEqual({
        title: "Ääni",
        titleId: "12",
        performers: "One, Two",
        songwriters: ["Writer One", "Writer Two"],
        album: "Album",
        albumId: "34",
        trackNumber: "3",
        genre: "Rock, Pop",
        year: 2000,
        isrc: ["COMMON123456"],
        label: "Label",
        durationFormatted: "2:05",
        fileSize: "1.50 MB"
    });
});

test("preserves different summary and sending priorities for label and native ISRC", () => {
    const metadata = {
        common: { label: "Common label", copyright: "© 2010 Copyright label" },
        native: { mp4: [
            { id: "cprt", value: "℗ 1998 Native label" },
            { id: "xid ", value: "isrc:US1234567890" },
            { id: "UFID", value: { identifier: "LAST12345678" } }
        ] }
    };
    expect(getSummaryData(metadata, 0)).toMatchObject({
        year: "1998",
        label: "Native label",
        isrc: "LAST12345678"
    });
    expect(mapItunesMetadataToTrack(metadata).tracks[0]).toMatchObject({
        isrc: "US1234567890",
        album: { master_ownerships: [{ label: { label_name: "Common label" } }] }
    });
});

test("prefers common year and ISRC over native tags", () => {
    expect(getSummaryData({
        common: { year: 2005, isrc: "COMMON123456" },
        native: { mp4: [
            { id: "cprt", value: "℗ 1998 Label" },
            { id: "----:com.apple.iTunes:ISRC", value: "NATIVE123456" }
        ] }
    }, 0)).toMatchObject({ year: 2005, isrc: "COMMON123456" });
});

test("uses copyright, artist and native composer fallbacks", () => {
    expect(getSummaryData({
        common: { artist: " Solo ", copyright: "© 2010 Copyright label", genre: "Jazz" },
        native: { mp4: [{ id: "©wrt", value: "Writer One, Writer Two" }] }
    }, 0)).toMatchObject({
        year: "2010",
        label: "Copyright label",
        performers: "Solo",
        songwriters: ["Writer One", "Writer Two"],
        genre: "Jazz"
    });
});

test.each([
    ["xid ", "isrc:US1234567890", "US1234567890"],
    ["ISRC", "Native ISRC", "Native ISRC"],
    ["UFID", { identifier: "Identifier" }, "Identifier"],
    ["----:com.apple.iTunes:ISRC", "Apple ISRC", "Apple ISRC"]
])("reads the existing %s ISRC fallback", (id, value, expected) => {
    expect(getSummaryData({ native: { mp4: [{ id, value }] } }, 0).isrc).toBe(expected);
});

test("uses only the first picture and leaves the parsed bytes unchanged", () => {
    const bytes = new Uint8Array([65, 66, 67]);
    const metadata = { common: { picture: [
        { format: "image/png", data: bytes },
        { format: "image/jpeg", data: new Uint8Array([0]) }
    ] } };
    expect(getAlbumArt(metadata)).toBe("data:image/png;base64,QUJD");
    const serialized = serializeMetadata(metadata);
    expect(serialized.common.picture[0].data)
        .toBe("Image binary data is very long so it is hidden for convenience");
    expect(metadata.common.picture[0].data).toBe(bytes);
    expect(Array.from(bytes)).toEqual([65, 66, 67]);
    expect(getAlbumArt({})).toBeNull();
});

test("serializes a detached copy without altering other JSON values", () => {
    const original = { common: { title: " Original " }, native: { mp4: [] } };
    const serialized = serializeMetadata(original);
    expect(serialized).toEqual(original);
    serialized.common.title = "Edited";
    expect(original.common.title).toBe(" Original ");
});
