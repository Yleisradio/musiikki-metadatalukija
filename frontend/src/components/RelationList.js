function RelationList({ items, members }) {
    if ((!items || items.length === 0) && (!members || members.length === 0)) return null;

    return (
        <span className="relation-list d-block">
            {items?.map((item, index) => (
                <span key={`${item}-${index}`} className="relation-item d-flex align-items-start gap-2">
                    <span className="relation-bullet">•</span>
                    <span>{item}</span>
                </span>
            ))}
            {members?.map((member, index) => (
                <span key={`${member.name}-${index}`} className="relation-item d-flex align-items-start gap-2">
                    <span className="relation-bullet">•</span>
                    <span>
                        {member.name}
                        {member.roles.length > 0 && ` (${member.roles.join(", ")})`}
                        {member.original ? " [original]" : ""}
                        {member.begin || member.end ? ` — ${member.begin || "?"}–${member.end || "?"}` : ""}
                    </span>
                </span>
            ))}
        </span>
    );
}

export default RelationList;
