function JsonMetadataPanel({ title, data, headingId }) {
    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className="h5">{title}</h2>
            <div className="json-content">
                <pre className="mb-0">{JSON.stringify(data, null, 2)}</pre>
            </div>
        </section>
    );
}

export default JsonMetadataPanel;
