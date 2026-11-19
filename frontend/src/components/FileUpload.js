import { useDropzone } from "react-dropzone";
import AlbumArt from "./AlbumArt";

function FileUpload({ fileName, imageUrl, onFileSelected }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) onFileSelected(acceptedFiles[0]);
        },
        accept: { "audio/*": [] },
        multiple: false
    });

    return (
        <>
            <div className="upload-header-row">
                <AlbumArt imageUrl={imageUrl} />
                <div className="upload-area" {...getRootProps()}>
                    <input {...getInputProps()} />
                    <p>{isDragActive
                        ? "Pudota audiotiedosto tähän..."
                        : "Pudota audiotiedosto tai klikkaa tästä ja valitse."}</p>
                </div>
            </div>
            {fileName && <p><strong>Tiedosto:</strong> {fileName}</p>}
        </>
    );
}

export default FileUpload;
