import { capitalizeFirstLetter } from "../utils/metadata";
import RelationList from "./RelationList";

function GeneralMetadataPanel({ data }) {
    const performers = data.performers
        ? data.performers.split(/,|&/).map((name) => name.trim()).filter(Boolean)
        : [];

    return (
        <section className="card card-body shadow-sm metadata-card clean-metadata">
            <h2 className="card-title h5">Yleistiedot</h2>
            <div className="row g-3">
                <div className="col-12 col-sm-6 metadata-column">
                    <p>
                        <strong>Kappale:</strong><br />
                        {data.titleId ? (
                            <a href={`https://music.apple.com/song/${data.titleId}`} target="_blank" rel="noopener noreferrer">
                                {data.title}
                            </a>
                        ) : data.title}
                        <span className="d-block">{capitalizeFirstLetter(data.title)}</span>
                    </p>
                    <div className="sub-info">
                        <p>
                            <strong>Albumilta:</strong><br />
                            {data.albumId ? (
                                <a href={`https://music.apple.com/album/${data.albumId}`} target="_blank" rel="noopener noreferrer">
                                    {data.album}
                                </a>
                            ) : data.album}
                        </p>
                    </div>
                    <p><strong>Uranumero:</strong><br />{data.trackNumber}</p>
                    <p><strong>Levy-yhtiö:</strong><br />{data.label}</p>
                    <p><strong>Julkaisuvuosi:</strong><br />{data.year}</p>
                    <p><strong>Kesto:</strong><br />{data.durationFormatted}</p>
                    <p><strong>Tiedostokoko:</strong><br />{data.fileSize}</p>
                </div>
                <div className="col-12 col-sm-6 metadata-column">
                    <p><strong>Esittäjät:</strong><br /><RelationList items={performers} /></p>
                    <p><strong>ISRC:</strong><br />{data.isrc}</p>
                    {data.songwriters.length > 0 && (
                        <p><strong>Tekijät:</strong><br /><RelationList items={data.songwriters} /></p>
                    )}
                    <p><strong>Laji:</strong><br />{data.genre}</p>
                </div>
            </div>
        </section>
    );
}

export default GeneralMetadataPanel;
