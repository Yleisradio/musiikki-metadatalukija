import { useState } from "react";
import JsonMetadataPanel from "./JsonMetadataPanel";

function updateTrackValue(track, path, nextValue) {
    const [key, ...remainingPath] = path;
    const updated = Array.isArray(track) ? [...track] : { ...track };

    updated[key] = remainingPath.length
        ? updateTrackValue(track[key], remainingPath, nextValue)
        : nextValue;

    return updated;
}

const fields = [
    { label: "Kartuntatunnus (albumi)", path: ["album", "custom", "CustomID"] },
    { label: "Kartuntatunnus (track)", path: ["custom", "CustomID"] },
    { label: "Kappaleen nimi", path: ["title"] },
    { label: "Uranumero", path: ["track_number"], type: "number" },
    { label: "Albumin nimi", path: ["album", "title"] },
    {
        label: "Esittäjän nimi",
        path: ["artists_master_ownerships", 0, "artist", "full_name"],
        mirrorPath: ["album", "artists_master_ownerships", 0, "artist", "full_name"]
    },
    {
        label: "Tekijän nimi",
        path: ["artists_publishing_ownerships", 0, "artist", "full_name"]
    },
    {
        label: "Tekijän rooli",
        path: ["artists_publishing_ownerships", 0, "rights_type", "key"]
    },
    { label: "ISRC", path: ["isrc"] },
    {
        label: "Levy-yhtiö",
        path: ["album", "master_ownerships", 0, "label", "label_name"]
    },
    {
        label: "Kataloginumero",
        path: ["album", "album_ref"],
        columnClass: "col-12"
    },
    {
        label: "Fennica",
        path: ["custom", "finnish_content"],
        mirrorPath: ["album", "custom", "finnish_content"],
        type: "checkbox",
        columnClass: "col-6"
    },
    {
        label: "Yle Master",
        path: ["custom", "yle_master"],
        mirrorPath: ["album", "custom", "yle_master"],
        type: "checkbox",
        disabled: true,
        columnClass: "col-6"
    }
];

function getValue(value, path) {
    return path.reduce((current, key) => current?.[key], value);
}

function MetadataView({ trackMetadata, originalMetadata, onTrackMetadataChange }) {
    const [showForm, setShowForm] = useState(true);
    const [showEdited, setShowEdited] = useState(true);
    const [showOriginal, setShowOriginal] = useState(true);
    const visiblePanels = Number(showForm) + Number(showEdited) + Number(showOriginal);
    const columnClass = `col-12 col-xl-${12 / Math.max(visiblePanels, 1)}`;

    const handleFieldChange = (path, value, mirrorPath) => {
        let updatedMetadata = updateTrackValue(trackMetadata, path, value);
        if (mirrorPath) updatedMetadata = updateTrackValue(updatedMetadata, mirrorPath, value);
        onTrackMetadataChange(updatedMetadata);
    };

    return (
        <div>
        <div className="d-flex flex-wrap gap-2 mb-3">
            <button type="button" className={`btn ${showForm ? "btn-primary" : "btn-outline-secondary"}`}
                aria-pressed={showForm} onClick={() => setShowForm((visible) => !visible)}>
                Metadatalomake
            </button>
            <button type="button" className={`btn ${showEdited ? "btn-primary" : "btn-outline-secondary"}`}
                aria-pressed={showEdited} onClick={() => setShowEdited((visible) => !visible)}>
                Muokattu metadata
            </button>
            <button type="button" className={`btn ${showOriginal ? "btn-primary" : "btn-outline-secondary"}`}
                aria-pressed={showOriginal} onClick={() => setShowOriginal((visible) => !visible)}>
                Alkuperäinen metadata
            </button>
        </div>
        <div className="row g-4 text-start align-items-start">
            {showForm && (
            <div className={columnClass}>
                <h2 className="h5 mb-3">Metadatalomake</h2>
                <section className="card card-body shadow-sm metadata-card">
                    <form className="row g-3" onSubmit={(event) => event.preventDefault()}>
                        {fields.map(({ label, path, mirrorPath, type, disabled, columnClass }) => {
                            const trackPath = ["tracks", 0, ...path];
                            const mirrorTrackPath = mirrorPath
                                ? ["tracks", 0, ...mirrorPath]
                                : undefined;
                            const id = `metadata-field-${trackPath.join("-")}`;
                            const value = getValue(trackMetadata, trackPath);

                            return (
                                <div
                                    className={columnClass || `col-12 col-md-6${showEdited && showOriginal ? " col-xl-12" : ""}`}
                                    key={label}
                                >
                                    <label className="form-label" htmlFor={id}>{label}</label>
                                    {type === "checkbox" ? (
                                        <div className="form-check">
                                            <input
                                                id={id}
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={Boolean(value)}
                                                disabled={disabled}
                                                title={disabled ? "Disabloitu" : undefined}
                                                onChange={(event) =>
                                                    handleFieldChange(trackPath, event.target.checked, mirrorTrackPath)
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            id={id}
                                            className="form-control"
                                            type={type || "text"}
                                            value={value ?? ""}
                                            disabled={disabled}
                                            title={disabled ? "Disabloitu" : undefined}
                                            onChange={(event) => {
                                                const nextValue = type === "number"
                                                    ? (event.target.value === ""
                                                        ? ""
                                                        : Number(event.target.value))
                                                    : event.target.value;
                                                handleFieldChange(trackPath, nextValue, mirrorTrackPath);
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </form>
                </section>
            </div>
            )}
            {showEdited && (
                <div className={columnClass}>
                    <JsonMetadataPanel title="Muokattu metadata" data={trackMetadata} headingId="edited-metadata-heading" />
                </div>
            )}
            {showOriginal && (
                <div className={columnClass}>
                    <JsonMetadataPanel title="Alkuperäinen metadata" data={originalMetadata} headingId="original-metadata-heading" />
                </div>
            )}
        </div>
        </div>
    );
}

export default MetadataView;
