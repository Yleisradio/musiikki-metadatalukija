import { mapMetadataToTrack } from './trackMetadata';
import { addItunesMarker } from '../testUtils/metadataFixtures';

test('maps only metadata with a recognized source marker', () => {
  expect(mapMetadataToTrack({ common: { title: 'Unrecognized source' } })).toBeNull();
  expect(mapMetadataToTrack(addItunesMarker({ common: { title: 'iTunes source' } })))
    .toMatchObject({ tracks: [{ title: 'iTunes source' }] });
});
