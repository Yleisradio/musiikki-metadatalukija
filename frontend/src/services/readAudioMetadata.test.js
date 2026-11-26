import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import { readAudioMetadata } from "./readAudioMetadata";
import { addItunesMarker } from "../testUtils/metadataFixtures";

jest.mock("music-metadata-browser", () => ({ parseBlob: jest.fn() }));

beforeEach(() => {
    parseBlob.mockReset();
});

test("parses the selected file and prepares independent original and editable metadata", async () => {
    const file = new File(["audio"], "test.m4a", { type: "audio/mp4" });
    const metadata = addItunesMarker({
        common: { title: " Original ", picture: [{ format: "image/png", data: new Uint8Array([65]) }] }
    });
    parseBlob.mockImplementation(async () => {
        expect(window.Buffer).toBe(Buffer);
        return metadata;
    });

    const result = await readAudioMetadata(file);
    expect(parseBlob).toHaveBeenCalledWith(file);
    expect(result).toMatchObject({
        status: "success",
        cleanData: { title: "Original", fileSize: "0.00 MB" },
        albumArt: "data:image/png;base64,QQ==",
        originalMetadata: { common: { title: " Original " } },
        trackMetadata: { tracks: [{ title: "Original" }] }
    });
    expect(result.originalMetadata.common.picture[0].data).toBe(
        "Image binary data is very long so it is hidden for convenience"
    );
    result.trackMetadata.tracks[0].title = "Edited";
    expect(result.originalMetadata.common.title).toBe(" Original ");
    expect(metadata.common.title).toBe(" Original ");
});

test("distinguishes an unrecognized source from a failed read", async () => {
    parseBlob.mockResolvedValue({ common: { title: "Unknown source" } });
    expect(await readAudioMetadata(new File([], "test.mp3")))
        .toEqual({ status: "unrecognized" });
});

test("propagates parser errors instead of returning empty metadata", async () => {
    const error = new Error("Invalid audio file");
    parseBlob.mockRejectedValue(error);
    await expect(readAudioMetadata(new File([], "broken.mp3"))).rejects.toBe(error);
});
