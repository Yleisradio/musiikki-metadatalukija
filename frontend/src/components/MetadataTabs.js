function MetadataTabs({ activeTab, onChange }) {
    return (
        <div className="tab-buttons" role="tablist" aria-label="Metatietonäkymät">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "main"}
                className={activeTab === "main" ? "active" : ""}
                onClick={() => onChange("main")}
            >
                Perusnäkymä
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "musicbrainz"}
                className={activeTab === "musicbrainz" ? "active" : ""}
                onClick={() => onChange("musicbrainz")}
            >
                MusicBrainz-näkymä
            </button>
        </div>
    );
}

export default MetadataTabs;
