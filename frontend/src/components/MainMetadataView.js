import ArtistMetadataPanel from "./ArtistMetadataPanel";
import GeneralMetadataPanel from "./GeneralMetadataPanel";

function MainMetadataView({ cleanData, artistDetails }) {
    return (
        <div className="row g-4 text-start align-items-start">
            <div className="col-12 col-md-6 col-xl-6">
                <GeneralMetadataPanel data={cleanData} />
            </div>
            <div className="col-12 col-md-6 col-xl-6 d-flex flex-column gap-4">
                {artistDetails.length > 0 ? artistDetails.map((artist) => (
                    <ArtistMetadataPanel key={artist.id} artist={artist} />
                )) : (
                    <section className="card card-body shadow-sm metadata-card artist-metadata-clean">
                        <h2 className="card-title h5 mb-0">Esittäjän lisätiedot</h2>
                    </section>
                )}
            </div>
        </div>
    );
}

export default MainMetadataView;
