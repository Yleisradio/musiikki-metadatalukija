import JsonMetadataPanel from "./JsonMetadataPanel";

function MusicBrainzView({ data, artistDetails }) {
    return (
        <div className="page-layout">
            <div className="bottom-row">
                <JsonMetadataPanel
                    title="Teoksen MusicBrainz-metadata"
                    data={data}
                    className="panel musicbrainz"
                />
                {artistDetails.length > 0 && (
                    <div className="artist-raw-column">
                        {artistDetails.map((artist) => (
                            <JsonMetadataPanel
                                key={artist.id}
                                title="Esittäjän MusicBrainz-metadata"
                                subtitle={artist.name}
                                data={artist}
                                className="panel artist-info"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MusicBrainzView;
