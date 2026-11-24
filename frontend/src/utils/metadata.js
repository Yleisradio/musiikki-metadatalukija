export const capitalizeFirstLetter = (value = "") =>
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export const normalizeNFC = (value = "") => (value ?? "").toString().normalize("NFC");

export const cleanText = (value = "") => normalizeNFC(value).trim();
