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
                Perustiedot
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "metadata"}
                className={`nav-link${activeTab === "metadata" ? " active" : ""}`}
                onClick={() => onChange("metadata")}
            >
                Metadatan muokkaus ja lähetys
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "original"}
                className={`nav-link${activeTab === "original" ? " active" : ""}`}
                onClick={() => onChange("original")}
            >
                Alkuperäinen metadata
            </button>
        </div>
    );
}

export default MetadataTabs;
