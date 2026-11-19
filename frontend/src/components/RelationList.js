function RelationList({ items, members }) {
    if ((!items || items.length === 0) && (!members || members.length === 0)) return <div />;

    return (
        <div className="relation-list">
            {items?.map((item, index) => (
                <div key={`${item}-${index}`} className="relation-item">
                    <span className="relation-bullet">•</span>
                    <span>{item}</span>
                </div>
            ))}
            {members?.map((member, index) => (
                <div key={`${member.name}-${index}`} className="relation-item">
                    <span className="relation-bullet">•</span>
                    <span>
                        {member.name}
                        {member.roles.length > 0 && ` (${member.roles.join(", ")})`}
                        {member.original ? " [original]" : ""}
                        {member.begin || member.end ? ` — ${member.begin || "?"}–${member.end || "?"}` : ""}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default RelationList;
