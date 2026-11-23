function updateTrackValue(track, path, nextValue) {
    const [key, ...remainingPath] = path;
    const updated = Array.isArray(track) ? [...track] : { ...track };

    updated[key] = remainingPath.length
        ? updateTrackValue(track[key], remainingPath, nextValue)
        : nextValue;

    return updated;
}

function MetadataFields({ value, path, onChange }) {
    if (value !== null && typeof value === "object") {
        const entries = Array.isArray(value)
            ? value.map((item, index) => [index, item])
            : Object.entries(value);
        const stringArrayFields = [
            "descriptions",
            "display_artists",
            "display_artists_aliases",
            "display_artists_full_names",
            "territories",
            "genre",
            "languages"
        ];
        const isStringArray = Array.isArray(value) && stringArrayFields.includes(path[path.length - 1]);
        const children = entries.length > 0 ? entries.map(([key, childValue]) => (
            <div className="metadata-field-row" key={`${path.join(".")}.${key}`}>
                <MetadataFields
                    value={childValue}
                    path={[...path, key]}
                    onChange={onChange}
                />
                {isStringArray && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        aria-label={`Poista ${path.join(" / ")} ${Number(key) + 1}`}
                        onClick={() => onChange(path, value.filter((_, index) => index !== key))}
                    >
                        Poista
                    </button>
                )}
            </div>
        )) : (
            <p className="text-body-secondary mb-2">Ei arvoja.</p>
        );

        if (path.length === 0) return <div>{children}</div>;

        return (
            <div className="metadata-fields-group">
                <div className="metadata-fields-group-title">{path[path.length - 1]}</div>
                <div className="metadata-fields-children">
                    {children}
                    {isStringArray && (
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onChange(path, [...value, ""])}
                        >
                            Lisää arvo
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const fieldPath = path.join(" / ");
    const inputId = `track-field-${path.join("-")}`;

    return (
        <div className="mb-3">
            <label className="form-label" htmlFor={inputId}>{fieldPath}</label>
            {typeof value === "boolean" ? (
                <div className="form-check">
                    <input
                        id={inputId}
                        className="form-check-input"
                        type="checkbox"
                        checked={value}
                        onChange={(event) => onChange(path, event.target.checked)}
                    />
                </div>
            ) : (
                <input
                    id={inputId}
                    className="form-control"
                    type={typeof value === "number" ? "number" : "text"}
                    step={typeof value === "number" ? "any" : undefined}
                    value={value ?? ""}
                    onChange={(event) => {
                        const nextValue = typeof value === "number" && event.target.value !== ""
                            ? Number(event.target.value)
                            : event.target.value;
                        onChange(path, nextValue);
                    }}
                />
            )}
        </div>
    );
}

function MetadataView({ trackMetadata, onTrackMetadataChange }) {
    const handleFieldChange = (path, value) => {
        onTrackMetadataChange(updateTrackValue(trackMetadata, path, value));
    };

    return (
        <div className="row g-4 text-start align-items-start">
            <div className="col-12 col-xl-6">
                <section className="card card-body shadow-sm metadata-card">
                    <div className="metadata-editor">
                        <MetadataFields value={trackMetadata} path={[]} onChange={handleFieldChange} />
                    </div>
                </section>
            </div>
            <div className="col-12 col-xl-6">
                <div className="json-content">
                    <pre className="mb-0">{JSON.stringify(trackMetadata, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}

export default MetadataView;
