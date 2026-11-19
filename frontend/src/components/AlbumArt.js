function AlbumArt({ imageUrl }) {
    return (
        <div className="album-art">
            {imageUrl ? (
                <img src={imageUrl} alt="Albumin kansikuva" />
            ) : (
                <div className="album-art-placeholder">Ei kuvaa</div>
            )}
        </div>
    );
}

export default AlbumArt;
