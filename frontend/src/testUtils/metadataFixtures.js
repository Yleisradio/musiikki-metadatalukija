export function addItunesMarker(metadata) {
  return {
    ...metadata,
    native: {
      ...metadata.native,
      mp4: [...(metadata.native?.mp4 ?? []), { id: 'cnID', value: 12345 }]
    }
  };
}
