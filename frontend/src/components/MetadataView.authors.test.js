import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetadataView from './MetadataView';
import { mapMetadataToTrack } from '../utils/trackMetadata';
import { addItunesMarker } from '../testUtils/metadataFixtures';

test('parses multiple composers and lets the user add and edit authors', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { composer: ['Stefan Burnett, Zach Hill & Andy Morin'] }
  }));
  const { rerender } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );

  expect(screen.getByRole('heading', { name: 'Tekijät' })).toBeInTheDocument();
  expect([0, 1, 2].map((index) =>
    document.getElementById(`metadata-author-name-${index}`).value
  ))
    .toEqual(['Stefan Burnett', 'Zach Hill', 'Andy Morin']);
  expect(screen.getByRole('heading', { name: 'Tekijät' }).parentElement.parentElement)
    .toHaveClass('border-top');
  expect(document.getElementById('metadata-author-role-0')).toHaveValue('author');
  expect(document.getElementById('metadata-author-role-0').querySelectorAll('option'))
    .toHaveLength(4);
  expect(Array.from(document.getElementById('metadata-author-role-0').options).map(({ text }) => text))
    .toEqual(['Sanoittaja', 'Säveltäjä', 'Sovittaja', 'Tekijä']);

  userEvent.click(screen.getByRole('button', { name: '+ Lisää tekijä' }));
  rerender(
    <MetadataView
      trackMetadata={onTrackMetadataChange.mock.lastCall[0]}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(document.getElementById('metadata-author-name-3')).toHaveValue('');
  expect(document.getElementById('metadata-author-role-3')).toHaveValue('author');
  fireEvent.change(document.getElementById('metadata-author-name-3'), {
    target: { value: 'New Writer' }
  });
  rerender(
    <MetadataView
      trackMetadata={onTrackMetadataChange.mock.lastCall[0]}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  fireEvent.change(document.getElementById('metadata-author-role-3'), {
    target: { value: 'composer' }
  });
  const updatedAuthors = onTrackMetadataChange.mock.lastCall[0].tracks[0].artists_publishing_ownerships;
  expect(updatedAuthors).toHaveLength(4);
  expect(updatedAuthors[3]).toEqual({
    artist: { full_name: 'New Writer' },
    rights_type: { key: 'composer' }
  });
});

test('removes the selected author and role pair', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { composer: ['First Writer', 'Second Writer', 'Third Writer'] }
  }));
  const { rerender } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );

  userEvent.click(screen.getByRole('button', { name: 'Poista tekijä 2' }));
  const updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].artists_publishing_ownerships.map(
    ({ artist, rights_type }) => [artist.full_name, rights_type.key]
  )).toEqual([
    ['First Writer', 'author'],
    ['Third Writer', 'author']
  ]);
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(screen.queryByDisplayValue('Second Writer')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Third Writer')).toBeInTheDocument();
});

test('stores author role codes while displaying Finnish labels', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { composer: ['Writer'] }
  }));
  const { rerender } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );
  const role = screen.getByLabelText('Rooli');

  for (const [label, value] of [
    ['Sanoittaja', 'lyricist'],
    ['Säveltäjä', 'composer'],
    ['Sovittaja', 'arranger'],
    ['Tekijä', 'author']
  ]) {
    userEvent.selectOptions(role, value);
    const updated = onTrackMetadataChange.mock.lastCall[0];
    expect(updated.tracks[0].artists_publishing_ownerships[0].rights_type.key).toBe(value);
    rerender(<MetadataView trackMetadata={updated} onTrackMetadataChange={onTrackMetadataChange} />);
    expect(role).toHaveValue(value);
    expect(role.selectedOptions[0]).toHaveTextContent(label);
    expect(screen.getByRole('region', { name: 'Muokattu metadata' }))
      .toHaveTextContent(`"key": "${value}"`);
  }
});
