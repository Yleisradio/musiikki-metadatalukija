import { fireEvent, render, screen } from '@testing-library/react';
import MetadataView from './MetadataView';
import { mapMetadataToTrack } from '../utils/trackMetadata';
import { addItunesMarker } from '../testUtils/metadataFixtures';

test('builds the track catalog number from the album catalog number and track number', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { track: { no: 9 } }
  }));
  const { rerender } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );
  const trackCatalogNumber = screen.getByLabelText('Kartuntatunnus (track)');

  expect(trackCatalogNumber).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Kartuntatunnus (albumi)'), {
    target: { value: 'ALBUM-123' }
  });

  const updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].album.custom.CustomID).toBe('ALBUM-123');
  expect(updatedMetadata.tracks[0].custom.CustomID).toBe('ALBUM-123-09');
  expect(updatedMetadata.tracks[0].track_number).toBe(9);
  rerender(
    <MetadataView trackMetadata={updatedMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );
  expect(screen.getByLabelText('Uranumero')).toHaveValue(9);
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toBeDisabled();

  fireEvent.change(screen.getByLabelText('Kartuntatunnus (albumi)'), {
    target: { value: 'ALBUM-456' }
  });
  expect(onTrackMetadataChange.mock.lastCall[0].tracks[0].custom.CustomID)
    .toBe('ALBUM-456-09');
});

test('does not zero-pad track catalog numbers for track numbers of ten or more', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { track: { no: 10 } }
  }));
  render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );

  fireEvent.change(screen.getByLabelText('Kartuntatunnus (albumi)'), {
    target: { value: 'ALBUM-123' }
  });

  expect(onTrackMetadataChange.mock.lastCall[0].tracks[0].custom.CustomID)
    .toBe('ALBUM-123-10');
  expect(onTrackMetadataChange.mock.lastCall[0].tracks[0].track_number).toBe(10);
});

test('updates the track catalog number when the track number changes or is cleared', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { track: { no: 3 } }
  }));
  const { rerender } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );
  const changeField = (label, value) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    const updated = onTrackMetadataChange.mock.lastCall[0];
    rerender(<MetadataView trackMetadata={updated} onTrackMetadataChange={onTrackMetadataChange} />);
    return updated.tracks[0];
  };

  expect(changeField('Kartuntatunnus (albumi)', 'ALBUM-123').custom.CustomID).toBe('ALBUM-123-03');
  let track = changeField('Uranumero', '9');
  expect(track.custom.CustomID).toBe('ALBUM-123-09');
  expect(track.track_number).toBe(9);
  expect(screen.getByLabelText('Uranumero')).toHaveValue(9);

  track = changeField('Uranumero', '10');
  expect(track.custom.CustomID).toBe('ALBUM-123-10');
  expect(track.track_number).toBe(10);
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toBeDisabled();

  track = changeField('Uranumero', '');
  expect(track.custom.CustomID).toBe('');
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toBeEnabled();

  track = changeField('Uranumero', '2');
  expect(track.custom.CustomID).toBe('ALBUM-123-02');
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toBeDisabled();
});

test('does not keep a manual track catalog number when a track number is entered without an album ID', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: {} }));
  const { rerender } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );
  fireEvent.change(screen.getByLabelText('Kartuntatunnus (track)'), {
    target: { value: 'MANUAL' }
  });
  rerender(
    <MetadataView trackMetadata={onTrackMetadataChange.mock.lastCall[0]} onTrackMetadataChange={onTrackMetadataChange} />
  );
  fireEvent.change(screen.getByLabelText('Uranumero'), { target: { value: '1' } });

  expect(onTrackMetadataChange.mock.lastCall[0].tracks[0].custom.CustomID).toBe('');
});
