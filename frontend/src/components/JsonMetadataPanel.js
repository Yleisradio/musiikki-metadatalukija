import { useEffect, useRef } from "react";

function isHighlighted(path, highlightedPaths = []) {
    return highlightedPaths.some((highlightedPath) =>
        highlightedPath.length <= path.length
        && highlightedPath.every((part, index) => path[index] === part)
    );
}

function renderJsonLines(value, path, depth, highlightedPaths, prefix = "", isLast = true) {
    const indent = "  ".repeat(depth);
    const comma = isLast ? "" : ",";
    const isArray = Array.isArray(value);
    const isObject = value !== null && typeof value === "object";
    const className = isHighlighted(path, highlightedPaths)
        ? "json-line json-line-highlight"
        : "json-line";

    if (!isObject || Object.keys(value).length === 0) {
        return [
            <span
                className={className}
                data-json-path={JSON.stringify(path)}
                key={JSON.stringify(path)}
            >
                {`${indent}${prefix}${JSON.stringify(value)}${comma}\n`}
            </span>
        ];
    }

    const lines = [
        <span
            className={className}
            data-json-path={JSON.stringify(path)}
            key={`${JSON.stringify(path)}-open`}
        >
            {`${indent}${prefix}${isArray ? "[" : "{"}\n`}
        </span>
    ];

    Object.entries(value).forEach(([key, child], index, entries) => {
        const childPath = [...path, isArray ? Number(key) : key];
        const childPrefix = isArray ? "" : `${JSON.stringify(key)}: `;
        lines.push(...renderJsonLines(
            child,
            childPath,
            depth + 1,
            highlightedPaths,
            childPrefix,
            index === entries.length - 1
        ));
    });

    lines.push(
        <span
            className={className}
            data-json-path={JSON.stringify(path)}
            key={`${JSON.stringify(path)}-close`}
        >
            {`${indent}${isArray ? "]" : "}"}${comma}\n`}
        </span>
    );
    return lines;
}

function JsonMetadataPanel({ title, data, headingId, highlightedPaths = [] }) {
    const contentRef = useRef(null);

    useEffect(() => {
        if (!highlightedPaths.length || !contentRef.current) return;

        const target = Array.from(contentRef.current.querySelectorAll("[data-json-path]"))
            .find((line) => isHighlighted(JSON.parse(line.dataset.jsonPath), highlightedPaths));
        if (!target) return;

        const container = contentRef.current;
        const targetTop = target.getBoundingClientRect().top
            - container.getBoundingClientRect().top
            + container.scrollTop;
        if (targetTop < container.scrollTop || targetTop > container.scrollTop + container.clientHeight) {
            container.scrollTop = targetTop - container.clientHeight / 3;
        }
    }, [highlightedPaths, data]);

    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className="h5">{title}</h2>
            <div className="json-content" ref={contentRef}>
                <pre className="mb-0">{renderJsonLines(data, [], 0, highlightedPaths)}</pre>
            </div>
        </section>
    );
}

export default JsonMetadataPanel;
