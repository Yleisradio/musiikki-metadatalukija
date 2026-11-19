import { useState } from "react";
import JsonView from "react18-json-view";

function JsonMetadataPanel({ title, data, subtitle }) {
    const [showJsonTree, setShowJsonTree] = useState(false);

    return (
        <section className="card card-body shadow-sm metadata-card">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <div>
                    <h2 className="card-title h5 mb-0">{title}</h2>
                    {subtitle && <h3 className="h6 text-body-secondary mt-2 mb-0">{subtitle}</h3>}
                </div>
                <button type="button" className="btn btn-primary btn-sm flex-shrink-0" onClick={() => setShowJsonTree((visible) => !visible)}>
                    {showJsonTree ? "Tekstinäkymä" : "JSON-näkymä"}
                </button>
            </div>
            <div className="json-content">
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
                    <pre className="mb-0">{JSON.stringify(data, null, 2)}</pre>
                )}
            </div>
        </section>
    );
}

export default JsonMetadataPanel;
