import JsonMetadataPanel from "./JsonMetadataPanel";

function MusicBrainzView({ data, artistDetails }) {
    return (
        <div className="text-start">
            <div className="d-flex flex-column gap-4">
                <JsonMetadataPanel
                    title="Teoksen MusicBrainz-metadata"
                    data={data}
                />
                {artistDetails.length > 0 && (
                    <div className="d-flex flex-column gap-4">
                        {artistDetails.map((artist) => (
                            <JsonMetadataPanel
                                key={artist.id}
                                title="Esittäjän MusicBrainz-metadata"
                                subtitle={artist.name}
                                data={artist}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MusicBrainzView;
