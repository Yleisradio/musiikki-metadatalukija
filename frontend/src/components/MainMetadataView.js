import ArtistMetadataPanel from "./ArtistMetadataPanel";
import GeneralMetadataPanel from "./GeneralMetadataPanel";
import JsonMetadataPanel from "./JsonMetadataPanel";

function MainMetadataView({ cleanData, artistDetails, metadata }) {
    return (
        <div className="main-layout-three-columns">
            <GeneralMetadataPanel data={cleanData} />
            <div className="artist-summary-column">
                {artistDetails.length > 0 ? artistDetails.map((artist) => (
                    <ArtistMetadataPanel key={artist.id} artist={artist} />
                )) : (
                    <section className="panel artist-metadata-clean">
                        <h2>Esittäjän lisätiedot</h2>
                    </section>
                )}
            </div>
            <JsonMetadataPanel title="Tiedoston metadata" data={metadata} />
        </div>
    );
}

export default MainMetadataView;
