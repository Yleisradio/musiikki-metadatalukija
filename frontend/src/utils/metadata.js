export const capitalizeFirstLetter = (value = "") =>
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export const normalizeNFC = (value = "") => (value ?? "").toString().normalize("NFC");

export const cleanText = (value = "") => normalizeNFC(value).trim();

export const formatFinnishDate = (dateString = "") => {
    if (!dateString) return "";
    const parts = dateString.split("-");

    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${Number(day)}.${Number(month)}.${year}`;
    }

    if (parts.length === 2) {
        const [year, month] = parts;
        return `${Number(month)}.${year}`;
    }

    return dateString;
};
