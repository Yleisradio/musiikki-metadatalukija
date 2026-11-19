function MetadataTabs({ activeTab, onChange }) {
    return (
        <div className="nav nav-tabs justify-content-center gap-1 my-4" role="tablist" aria-label="Metatietonäkymät">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "main"}
                className={`nav-link${activeTab === "main" ? " active" : ""}`}
                onClick={() => onChange("main")}
            >
                Perusnäkymä
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "musicbrainz"}
                className={`nav-link${activeTab === "musicbrainz" ? " active" : ""}`}
                onClick={() => onChange("musicbrainz")}
            >
                MusicBrainz-näkymä
            </button>
        </div>
    );
}

export default MetadataTabs;
