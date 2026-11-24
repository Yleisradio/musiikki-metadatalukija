import AlbumArt from "./AlbumArt";
import GeneralMetadataPanel from "./GeneralMetadataPanel";

function MainMetadataView({ cleanData, albumArt }) {
    return (
        <div className="row g-4 text-start align-items-start">
            <div className="col-12 col-md-6 col-xl-6">
                <GeneralMetadataPanel data={cleanData} />
            </div>
            {albumArt && (
                <div className="col-12 col-md-6 col-xl-6">
                    <AlbumArt imageUrl={albumArt} />
                </div>
            )}
        </div>
    );
}

export default MainMetadataView;
