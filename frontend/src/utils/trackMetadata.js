import { canMapItunesMetadata, mapItunesMetadataToTrack } from "./metadataMappers/itunes";

const metadataMappers = [
    { canMap: canMapItunesMetadata, map: mapItunesMetadataToTrack }
];

export function mapMetadataToTrack(metadata) {
    const mapper = metadataMappers.find(({ canMap }) => canMap(metadata));
    return mapper ? mapper.map(metadata) : null;
}
