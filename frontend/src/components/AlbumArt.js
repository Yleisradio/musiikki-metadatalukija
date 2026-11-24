function AlbumArt({ imageUrl }) {
    if (!imageUrl) return null;

    return (
        <div className="album-art d-flex align-items-center justify-content-center">
            <img className="rounded-3 shadow-sm" src={imageUrl} alt="Albumin kansikuva" />
        </div>
    );
}

export default AlbumArt;
