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

function getNativeTagValuePath(metadata, matchesTag) {
    for (const [format, tags] of Object.entries(metadata?.native ?? {})) {
        const index = tags.findIndex((tag) => matchesTag(String(tag.id ?? "").toLowerCase()));
        if (index !== -1) return ["native", format, index, "value"];
    }
    return null;
}

function hasSourceValue(value) {
    if (value == null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) {
        return value.some((item) =>
            typeof item === "string" ? item.trim() !== "" : item != null
        );
    }
    return true;
}

function getComposerSourcePath(metadata) {
    if (hasSourceValue(metadata?.common?.composer)) return ["common", "composer"];
    return getNativeTagValuePath(metadata, (id) => id === "©wrt");
}

function resolveSourcePath(metadata, sourcePath) {
    if (!sourcePath) return null;
    if (typeof sourcePath === "function") return sourcePath(metadata);
    return hasSourceValue(getValue(metadata, sourcePath)) ? sourcePath : null;
}

function getNativeIsrcPath(metadata) {
    return getNativeTagValuePath(metadata, (id) =>
        id === "xid " || id.includes("isrc") || id.includes("ufid")
    );
}

function getLabelSourcePath(metadata) {
    if (hasSourceValue(metadata?.common?.label)) return ["common", "label"];
    return getNativeTagValuePath(metadata, (id) => id === "cprt");
}

const fields = [
    { label: "Kartuntatunnus (albumi)", path: ["album", "custom", "CustomID"] },
    { label: "Kartuntatunnus (track)", path: ["custom", "CustomID"] },
    { label: "Kappaleen nimi", path: ["title"], sourcePath: ["common", "title"] },
    { label: "Uranumero", path: ["track_number"], type: "number", sourcePath: ["common", "track", "no"] },
    { label: "Albumin nimi", path: ["album", "title"] },
    {
        label: "Esittäjän nimi",
        path: ["artists_master_ownerships", 0, "artist", "full_name"],
        mirrorPath: ["album", "artists_master_ownerships", 0, "artist", "full_name"],
        sourcePath: (metadata) => hasSourceValue(metadata?.common?.artists)
            ? ["common", "artists"]
            : ["common", "artist"]
    },
    {
        label: "ISRC",
        path: ["isrc"],
        sourcePath: (metadata) => hasSourceValue(metadata?.common?.isrc)
            ? ["common", "isrc"]
            : getNativeIsrcPath(metadata)
    },
    {
        label: "Levy-yhtiö",
        path: ["album", "master_ownerships", 0, "label", "label_name"],
        sourcePath: getLabelSourcePath
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

const authorRoles = ["Sanoittaja", "Säveltäjä", "Sovittaja", "Tekijä"];
const newAuthor = {
    artist: { full_name: "" },
    rights_type: { key: "Tekijä" }
};

function getValue(value, path) {
    return path.reduce((current, key) => current?.[key], value);
}

function MetadataView({ trackMetadata, originalMetadata, onTrackMetadataChange, onSend, isSending }) {
    const [showForm, setShowForm] = useState(true);
    const [showEdited, setShowEdited] = useState(true);
    const [showOriginal, setShowOriginal] = useState(true);
    const [highlightedPaths, setHighlightedPaths] = useState({ edited: [], original: [] });
    const visiblePanels = Number(showForm) + Number(showEdited) + Number(showOriginal);
    const columnClass = `col-12 col-xl-${12 / Math.max(visiblePanels, 1)}`;

    const handleFieldChange = (path, value, mirrorPath) => {
        let updatedMetadata = updateTrackValue(trackMetadata, path, value);
        if (mirrorPath) updatedMetadata = updateTrackValue(updatedMetadata, mirrorPath, value);
        onTrackMetadataChange(updatedMetadata);
    };

    const handleFieldFocus = (editedPaths, sourcePath) => {
        const originalPath = resolveSourcePath(originalMetadata, sourcePath);
        setHighlightedPaths({
            edited: editedPaths,
            original: originalPath ? [originalPath] : []
        });
    };

    const renderField = ({ label, path, mirrorPath, type, disabled, columnClass: fieldColumnClass, sourcePath }) => {
        const trackPath = ["tracks", 0, ...path];
        const mirrorTrackPath = mirrorPath
            ? ["tracks", 0, ...mirrorPath]
            : undefined;
        const id = `metadata-field-${trackPath.join("-")}`;
        const value = getValue(trackMetadata, trackPath);

        return (
            <div
                className={fieldColumnClass || `col-12 col-md-6${showEdited && showOriginal ? " col-xl-12" : ""}`}
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
                            onFocus={() => handleFieldFocus(
                                [trackPath, mirrorTrackPath].filter(Boolean),
                                sourcePath
                            )}
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
                        onFocus={() => handleFieldFocus(
                            [trackPath, mirrorTrackPath].filter(Boolean),
                            sourcePath
                        )}
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
    };

    return (
        <div>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <div className="d-flex flex-wrap gap-2">
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
            <button
                type="button"
                className="btn btn-success ms-auto"
                onClick={onSend}
                disabled={!onSend || isSending}
            >
                {isSending ? "Lähetetään..." : "Lähetä"}
            </button>
        </div>
        <div className="row g-4 text-start align-items-start">
            {showForm && (
            <div className={columnClass}>
                <h2 className="h5 mb-3">Metadatalomake</h2>
                <section className="card card-body shadow-sm metadata-card">
                    <form className="row g-3" onSubmit={(event) => event.preventDefault()}>
                        {fields.slice(0, 5).map(renderField)}
                        <div className="col-12 border-top pt-3">
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <h3 className="h6 mb-0">Tekijät</h3>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleFieldChange(
                                        ["tracks", 0, "artists_publishing_ownerships"],
                                        [...(getValue(trackMetadata, ["tracks", 0, "artists_publishing_ownerships"]) ?? []), newAuthor]
                                    )}
                                >
                                    + Lisää tekijä
                                </button>
                            </div>
                            <div className="row g-3">
                                {(getValue(trackMetadata, ["tracks", 0, "artists_publishing_ownerships"]) ?? [])
                                    .map((author, index) => {
                                        const namePath = [
                                            "tracks", 0, "artists_publishing_ownerships", index, "artist", "full_name"
                                        ];
                                        const rolePath = [
                                            "tracks", 0, "artists_publishing_ownerships", index, "rights_type", "key"
                                        ];
                                        const nameId = `metadata-author-name-${index}`;
                                        const roleId = `metadata-author-role-${index}`;

                                        return (
                                            <div className="col-12" key={index}>
                                                <div className="row g-3">
                                                    <div className="col-12 col-md-6">
                                                        <label className="form-label" htmlFor={nameId}>
                                                            Tekijä
                                                        </label>
                                                        <input
                                                            id={nameId}
                                                            className="form-control"
                                                            type="text"
                                                            value={getValue(trackMetadata, namePath) ?? ""}
                                                            onFocus={() => handleFieldFocus(
                                                                [namePath],
                                                                getComposerSourcePath
                                                            )}
                                                            onChange={(event) =>
                                                                handleFieldChange(namePath, event.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-6">
                                                        <label className="form-label" htmlFor={roleId}>
                                                            Rooli
                                                        </label>
                                                        <select
                                                            id={roleId}
                                                            className="form-select"
                                                            value={getValue(trackMetadata, rolePath) || "Tekijä"}
                                                            onFocus={() => handleFieldFocus([rolePath], null)}
                                                            onChange={(event) =>
                                                                handleFieldChange(rolePath, event.target.value)
                                                            }
                                                        >
                                                            {authorRoles.map((role) => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                        <div className="col-12 border-top pt-3">
                            <div className="row g-3">
                                {fields.slice(5).map(renderField)}
                            </div>
                        </div>
                    </form>
                </section>
            </div>
            )}
            {showEdited && (
                <div className={columnClass}>
                    <JsonMetadataPanel
                        title="Muokattu metadata"
                        data={trackMetadata}
                        headingId="edited-metadata-heading"
                        highlightedPaths={highlightedPaths.edited}
                    />
                </div>
            )}
            {showOriginal && (
                <div className={columnClass}>
                    <JsonMetadataPanel
                        title="Alkuperäinen metadata"
                        data={originalMetadata}
                        headingId="original-metadata-heading"
                        highlightedPaths={highlightedPaths.original}
                    />
                </div>
            )}
        </div>
        </div>
    );
}

export default MetadataView;
