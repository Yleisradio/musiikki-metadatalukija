import { useState } from "react";
import JsonView from "react18-json-view";

function JsonMetadataPanel({ title, data, className = "panel full-metadata", subtitle }) {
    const [showJsonTree, setShowJsonTree] = useState(false);

    return (
        <section className={className}>
            <div className="metadata-panel-header">
                <div>
                    <h2>{title}</h2>
                    {subtitle && <h3>{subtitle}</h3>}
                </div>
                <button className="toggle-button" onClick={() => setShowJsonTree((visible) => !visible)}>
                    {showJsonTree ? "Tekstinäkymä" : "JSON-näkymä"}
                </button>
            </div>
            {showJsonTree ? (
                <JsonView
                    src={data}
                    name={false}
                    collapsed={2}
                    displayDataTypes={false}
                    enableClipboard={false}
                    style={{ fontSize: "13px" }}
                />
            ) : (
                <pre>{JSON.stringify(data, null, 2)}</pre>
            )}
        </section>
    );
}

export default JsonMetadataPanel;
