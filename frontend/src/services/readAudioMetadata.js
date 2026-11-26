import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import { getAlbumArt, getSummaryData, serializeMetadata } from "../utils/audioMetadata";
import { mapMetadataToTrack } from "../utils/trackMetadata";

window.Buffer = Buffer;

export async function readAudioMetadata(file) {
    const parsedMetadata = await parseBlob(file);
    const originalMetadata = serializeMetadata(parsedMetadata);
    const trackMetadata = mapMetadataToTrack(originalMetadata);
    if (!trackMetadata) return { status: "unrecognized" };

    return {
        status: "success",
        originalMetadata,
        trackMetadata,
        albumArt: getAlbumArt(parsedMetadata),
        cleanData: getSummaryData(parsedMetadata, file.size)
    };
}
