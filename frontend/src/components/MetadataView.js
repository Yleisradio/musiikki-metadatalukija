import JsonMetadataPanel from "./JsonMetadataPanel";

function MetadataView({ metadata }) {
    return (
        <div className="text-start">
            <JsonMetadataPanel title="Tiedoston metadata" data={metadata} />
        </div>
    );
}

export default MetadataView;
