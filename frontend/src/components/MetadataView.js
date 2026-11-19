import JsonMetadataPanel from "./JsonMetadataPanel";

function updateMetadataValue(metadata, path, nextValue) {
    const updated = Array.isArray(metadata) ? [...metadata] : { ...metadata };
    const [key, ...remainingPath] = path;

    updated[key] = remainingPath.length
        ? updateMetadataValue(metadata[key], remainingPath, nextValue)
        : nextValue;

    return updated;
}

function orderedMetadataEntries(value) {
    const entries = Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value);
    return entries.sort(([firstKey], [secondKey]) => (
        firstKey === "common" ? -1 : secondKey === "common" ? 1 : 0
    ));
}

function orderRootMetadata(metadata) {
    if (
        !metadata ||
        Array.isArray(metadata) ||
        typeof metadata !== "object" ||
        !Object.prototype.hasOwnProperty.call(metadata, "common")
    ) {
        return metadata;
    }

    return {
        common: metadata.common,
        ...Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "common"))
    };
}

function MetadataFields({ value, path, onChange }) {
    if (value !== null && typeof value === "object") {
        const entries = orderedMetadataEntries(value);
        const children = entries.length > 0 ? entries.map(([key, childValue]) => (
            <MetadataFields
                key={`${path.join(".")}.${key}`}
                value={childValue}
                path={[...path, key]}
                onChange={onChange}
            />
        )) : (
            <p className="text-body-secondary mb-0">Ei muokattavia kenttiä.</p>
        );

        if (path.length === 0) return <div>{children}</div>;

        return (
            <details className="metadata-fields-group" open={path.length === 1}>
                <summary>{path[path.length - 1]}</summary>
                <div className="metadata-fields-children">{children}</div>
            </details>
        );
    }

    const label = path.join(" / ");
    const inputId = `metadata-field-${path.join("-")}`;

    return (
        <div className="mb-3">
            <label className="form-label" htmlFor={inputId}>{label}</label>
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

function MetadataView({ metadata, onMetadataChange }) {
    const handleFieldChange = (path, value) => {
        onMetadataChange(updateMetadataValue(metadata, path, value));
    };
    const displayedMetadata = orderRootMetadata(metadata);

    return (
        <div className="row g-4 text-start align-items-start">
            <div className="col-12 col-xl-6">
                <section className="card card-body shadow-sm metadata-card">
                    <h2 className="card-title h5">Muokkaa metadataa</h2>
                    <div className="metadata-editor">
                        <MetadataFields value={displayedMetadata} path={[]} onChange={handleFieldChange} />
                    </div>
                </section>
            </div>
            <div className="col-12 col-xl-6">
                <JsonMetadataPanel title="Tiedoston metadata" data={displayedMetadata} />
            </div>
        </div>
    );
}

export default MetadataView;
