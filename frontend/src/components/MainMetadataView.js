import ArtistMetadataPanel from "./ArtistMetadataPanel";
import AlbumArt from "./AlbumArt";
import GeneralMetadataPanel from "./GeneralMetadataPanel";

function MainMetadataView({ cleanData, artistDetails, albumArt }) {
    return (
        <div className="row g-4 text-start align-items-start">
            <div className="col-12 col-md-6 col-xl-6">
                <GeneralMetadataPanel data={cleanData} />
            </div>
            <div className="col-12 col-md-6 col-xl-6 d-flex flex-column gap-4">
                {artistDetails.length > 0 ? artistDetails.map((artist, index) => (
                    <ArtistMetadataPanel
                        key={artist.id}
                        artist={artist}
                        albumArt={index === 0 ? albumArt : null}
                    />
                )) : (
                    <section className="card card-body shadow-sm metadata-card artist-metadata-clean">
                        <h2 className="card-title h5 mb-0">Esittäjän lisätiedot</h2>
                        {albumArt && <AlbumArt imageUrl={albumArt} />}
                    </section>
                )}
            </div>
        </div>
    );
}

export default MainMetadataView;
