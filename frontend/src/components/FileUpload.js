import { useDropzone } from "react-dropzone";

function FileUpload({ fileName, onFileSelected, onFileRejected }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles, fileRejections) => {
            if (acceptedFiles.length > 0) onFileSelected(acceptedFiles[0]);
            if (fileRejections.length > 0) onFileRejected?.(fileRejections);
        },
        accept: { "audio/*": [] },
        multiple: false
    });

    return (
        <>
            <div className="row g-3 align-items-center justify-content-center upload-header-row mx-auto mb-3">
                <div className="col-12 col-sm">
                    <div className={`upload-area rounded-3 p-4 d-flex align-items-center justify-content-center${isDragActive ? " upload-area-active" : ""}`} {...getRootProps()}>
                        <input {...getInputProps({ "aria-label": "Valitse audiotiedosto" })} />
                        <p className="mb-0 text-primary">{isDragActive
                            ? "Pudota audiotiedosto tähän..."
                            : "Pudota audiotiedosto tai klikkaa tästä ja valitse."}</p>
                    </div>
                </div>
            </div>
            {fileName && <p className="small text-body-secondary text-break mb-4"><strong>Tiedosto:</strong> {fileName}</p>}
        </>
    );
}

export default FileUpload;
