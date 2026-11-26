import { mapItunesMetadataToTrack } from './itunes';

test('maps iTunes metadata to the complete sending payload', () => {
  const metadata = {
    common: {
      title: 'Test',
      artists: ['Artist One', 'Artist Two'],
      album: 'Album',
      isrc: 'US1234567890',
      track: { no: 3 },
      composer: ['Songwriter'],
      label: 'Test Label'
    }
  };
  const trackMetadata = mapItunesMetadataToTrack(metadata);
  expect(trackMetadata).toEqual({
    tracks: [{
      title: 'Test',
      isrc: 'US1234567890',
      track_number: 3,
      artists_master_ownerships: [{
        artist: { full_name: 'Artist One, Artist Two' }
      }],
      artists_publishing_ownerships: [{
        artist: { full_name: 'Songwriter' },
        rights_type: { key: 'author' }
      }],
      custom: {
        CustomID: '',
        finnish_content: false,
        yle_master: false
      },
      album: {
        title: ' ',
        artists_master_ownerships: [{
          artist: { full_name: 'Artist One, Artist Two' }
        }],
        master_ownerships: [{
          label: { label_name: 'Test Label' }
        }],
        album_ref: 'Ei kataloginumeroa',
        custom: {
          CustomID: '',
          finnish_content: false,
          yle_master: false
        }
      }
    }]
  });
});
