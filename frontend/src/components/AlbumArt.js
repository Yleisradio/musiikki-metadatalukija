function AlbumArt({ imageUrl }) {
    return (
        <div className="album-art d-flex align-items-center justify-content-center">
            {imageUrl ? (
                <img className="rounded-3 shadow-sm" src={imageUrl} alt="Albumin kansikuva" />
            ) : (
                <div className="album-art-placeholder rounded-3 shadow-sm text-body-secondary">Ei kuvaa</div>
            )}
        </div>
    );
}

export default AlbumArt;
