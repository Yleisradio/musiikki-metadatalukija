import { cleanText } from "./metadata";

export const dedupeValues = (items = [], excludeValue = "") => {
    const normalizedExclude = cleanText(excludeValue).toLowerCase();
    const seen = new Set();

    return items.filter((item) => {
        const cleaned = cleanText(item);
        const key = cleaned.toLowerCase();

        if (!cleaned || key === normalizedExclude || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const getRelationValues = (artist, relationType) => {
    if (!artist?.relations?.length) return [];
    return artist.relations
        .filter((relation) => relation.type === relationType && relation.artist?.name)
        .map((relation) => relation.artist.name);
};

export const getCurrentMembers = (artist) => {
    if (!artist?.relations?.length) return [];
    return artist.relations
        .filter((relation) =>
            relation.type === "member of band" &&
            relation.artist?.name &&
            relation.direction === "backward" &&
            relation.ended === false
        )
        .map((relation) => ({
            name: relation["target-credit"] || relation.artist.name,
            roles: relation.attributes?.filter((attribute) => attribute !== "original") || [],
            original: relation.attributes?.includes("original")
        }));
};

export const getFormerMembers = (artist) => {
    if (!artist?.relations?.length) return [];
    return artist.relations
        .filter((relation) =>
            relation.type === "member of band" &&
            relation.artist?.name &&
            relation.direction === "backward" &&
            relation.ended === true
        )
        .map((relation) => ({
            name: relation["target-credit"] || relation.artist.name,
            roles: relation.attributes?.filter((attribute) => attribute !== "original") || [],
            original: relation.attributes?.includes("original"),
            begin: relation.begin || "",
            end: relation.end || ""
        }));
};

export const getMemberOfBands = (artist) => {
    if (!artist?.relations?.length) return [];
    const bands = artist.relations
        .filter((relation) =>
            relation.type === "member of band" &&
            relation.artist?.name &&
            relation.direction === "forward"
        )
        .map((relation) => relation.artist.name);
    return dedupeValues(bands);
};

export const getAliasesByType = (artist, aliasType) => {
    if (!artist?.aliases?.length) return [];
    const aliases = artist.aliases
        .filter((alias) => alias.type === aliasType && alias.name)
        .map((alias) => alias.name);
    return dedupeValues(aliases, artist.name);
};

export const getMeaningfulSearchHints = (artist) => {
    if (!artist?.aliases?.length) return [];
    const hints = artist.aliases
        .filter((alias) =>
            alias.type === "Search hint" &&
            alias.name &&
            alias.name.trim().length > 1 &&
            !alias.name.toLowerCase().includes("vevo") &&
            !alias.name.toLowerCase().includes("channel")
        )
        .map((alias) => alias.name);
    return dedupeValues(hints, artist.name);
};
