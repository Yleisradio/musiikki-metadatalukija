import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetadataView from './MetadataView';
import { mapMetadataToTrack } from '../utils/trackMetadata';
import { addItunesMarker } from '../testUtils/metadataFixtures';

test('renders mapped metadata in the editable form and JSON panel', () => {
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
  const trackMetadata = mapMetadataToTrack(addItunesMarker(metadata));
  expect(trackMetadata.tracks[0].artists_publishing_ownerships[0].artist.full_name).toBe('Songwriter');
  const { container } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      onTrackMetadataChange={jest.fn()}
    />
  );

  expect(container.querySelector('section')).toHaveClass('card');
  expect(screen.getByLabelText('Kappaleen nimi')).toHaveValue('Test');
  expect(screen.getByLabelText('Uranumero')).toHaveValue(3);
  expect(screen.getByLabelText('Esittäjän nimi')).toHaveValue('Artist One, Artist Two');
  expect(screen.getByLabelText('Albumin nimi')).toHaveValue(' ');
  expect(container.querySelector('#metadata-author-name-0'))
    .toHaveValue('Songwriter');
  expect(screen.getByLabelText('Rooli')).toHaveValue('author');
  expect(screen.getByLabelText('Rooli').selectedOptions[0]).toHaveTextContent('Tekijä');
  expect(screen.getByLabelText('Levy-yhtiö')).toHaveValue('Test Label');
  expect(screen.getByLabelText('Kataloginumero')).toHaveValue('Ei kataloginumeroa');
  expect(screen.getByLabelText('Kartuntatunnus (albumi)')).toHaveValue('');
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toBeDisabled();
  expect(screen.getByLabelText('Fennica')).not.toBeChecked();
  expect(screen.getByLabelText('Yle Master')).not.toBeChecked();
  expect(screen.getByLabelText('Fennica')).toBeEnabled();
  expect(screen.getByLabelText('Yle Master')).toBeDisabled();
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');
});

test('keeps the album title non-empty while editing', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: {} }));
  const { rerender } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  const albumTitle = screen.getByLabelText('Albumin nimi');

  fireEvent.change(albumTitle, { target: { value: ' Albumin nimi' } });
  let updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].album.title).toBe('Albumin nimi');
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );

  fireEvent.change(screen.getByLabelText('Albumin nimi'), { target: { value: '' } });
  updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].album.title).toBe(' ');
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(screen.getByLabelText('Albumin nimi')).toHaveValue(' ');
});

test('highlights ISRC values that are neither empty nor 12 characters long', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: { isrc: 'US1234567890' }
  }));
  const { rerender } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  const isrc = screen.getByLabelText('ISRC');

  expect(isrc).not.toHaveClass('bg-warning-subtle');
  expect(isrc).toHaveAttribute('aria-invalid', 'false');

  fireEvent.change(isrc, { target: { value: 'US123456789' } });
  let updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(screen.getByLabelText('ISRC')).toHaveClass('bg-warning-subtle');
  expect(screen.getByLabelText('ISRC')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'ISRC-kentän pituuden on oltava 0 tai 12 merkkiä.'
  );

  fireEvent.change(screen.getByLabelText('ISRC'), { target: { value: 'US12345678901' } });
  updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(screen.getByLabelText('ISRC')).toHaveClass('bg-warning-subtle');

  fireEvent.change(screen.getByLabelText('ISRC'), { target: { value: '' } });
  updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(screen.getByLabelText('ISRC')).not.toHaveClass('bg-warning-subtle');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('ISRC')).toHaveAttribute('aria-invalid', 'false');

  fireEvent.change(screen.getByLabelText('ISRC'), { target: { value: 'US1234567890' } });
  updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  rerender(
    <MetadataView
      trackMetadata={updatedMetadata}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(screen.getByLabelText('ISRC')).not.toHaveClass('bg-warning-subtle');
});

test('edits mapped track fields through the form', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: { title: 'Original' } }));
  const { rerender, container } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );

  expect(screen.getByLabelText('Kartuntatunnus (track)')).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Kappaleen nimi'), { target: { value: 'Edited' } });
  expect(onTrackMetadataChange).toHaveBeenLastCalledWith({
    ...trackMetadata,
    tracks: [{
      ...trackMetadata.tracks[0],
      title: 'Edited'
    }]
  });
  rerender(
    <MetadataView
      trackMetadata={onTrackMetadataChange.mock.lastCall[0]}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Edited"');
  fireEvent.change(screen.getByLabelText('Kartuntatunnus (track)'), { target: { value: 'DIGI-1234-02' } });
  expect(onTrackMetadataChange.mock.lastCall[0].tracks[0].custom.CustomID).toBe('DIGI-1234-02');
});

test('updates the artist name on both track and album', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: { artists: ['Original artist'] } }));
  render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );

  fireEvent.change(screen.getByLabelText('Esittäjän nimi'), {
    target: { value: 'Updated artist' }
  });

  const updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].artists_master_ownerships[0].artist.full_name)
    .toBe('Updated artist');
  expect(updatedMetadata.tracks[0].album.artists_master_ownerships[0].artist.full_name)
    .toBe('Updated artist');
});

test('renders Fennica enabled and Yle Master disabled at the end of the form on the same row', () => {
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: {} }));
  render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={jest.fn()} />
  );

  const fennica = screen.getByLabelText('Fennica');
  const yleMaster = screen.getByLabelText('Yle Master');
  const catalogNumber = screen.getByLabelText('Kataloginumero');
  expect(fennica).toBeEnabled();
  expect(yleMaster).toBeDisabled();
  expect(catalogNumber.closest('.col-12')).not.toHaveClass('col-md-6');
  expect(fennica.closest('.col-6')).toBeInTheDocument();
  expect(yleMaster.closest('.col-6')).toBeInTheDocument();
  expect(fennica.closest('form')).toBe(yleMaster.closest('form'));
  expect(trackMetadata.tracks[0].custom.finnish_content).toBe(false);
  expect(trackMetadata.tracks[0].album.custom.finnish_content).toBe(false);
  expect(trackMetadata.tracks[0].custom.yle_master).toBe(false);
  expect(trackMetadata.tracks[0].album.custom.yle_master).toBe(false);
});

test('updates Fennica on both track and album when toggled', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: {} }));
  const { rerender, container } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );

  userEvent.click(screen.getByLabelText('Fennica'));
  let updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].custom.finnish_content).toBe(true);
  expect(updatedMetadata.tracks[0].album.custom.finnish_content).toBe(true);
  expect(trackMetadata.tracks[0].custom.finnish_content).toBe(false);
  rerender(<MetadataView trackMetadata={updatedMetadata} onTrackMetadataChange={onTrackMetadataChange} />);
  expect(screen.getByLabelText('Fennica')).toBeChecked();
  expect(container.querySelector('pre')).toHaveTextContent('"finnish_content": true');

  userEvent.click(screen.getByLabelText('Fennica'));
  updatedMetadata = onTrackMetadataChange.mock.lastCall[0];
  expect(updatedMetadata.tracks[0].custom.finnish_content).toBe(false);
  expect(updatedMetadata.tracks[0].album.custom.finnish_content).toBe(false);
  rerender(<MetadataView trackMetadata={updatedMetadata} onTrackMetadataChange={onTrackMetadataChange} />);
  expect(screen.getByLabelText('Fennica')).not.toBeChecked();
});

test('toggles the metadata form independently of the metadata panels', () => {
  render(
    <MetadataView
      trackMetadata={mapMetadataToTrack(addItunesMarker({ common: {} }))}
      originalMetadata={{}}
      onTrackMetadataChange={jest.fn()}
    />
  );
  const formToggle = screen.getByRole('button', { name: 'Metadatalomake' });

  expect(formToggle).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Metadatalomake' })).toBeInTheDocument();
  expect(screen.getByLabelText('Kappaleen nimi')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Metatiedot' })).not.toBeInTheDocument();

  userEvent.click(formToggle);
  expect(formToggle).toHaveAttribute('aria-pressed', 'false');
  expect(formToggle).toHaveClass('btn-outline-secondary');
  expect(screen.queryByRole('heading', { name: 'Metadatalomake' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Kappaleen nimi')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Muokattu metadata' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Alkuperäinen metadata' })).toBeInTheDocument();

  userEvent.click(formToggle);
  expect(formToggle).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Kappaleen nimi')).toBeInTheDocument();
});

test('uses full-width fields at the one-third desktop layout and restores the wider layout when toggled', () => {
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: {} }));
  render(<MetadataView trackMetadata={trackMetadata} originalMetadata={{}} onTrackMetadataChange={jest.fn()} />);
  const fields = screen.getByLabelText('Kappaleen nimi').closest('form').querySelectorAll('input:not([type="checkbox"])');
  const editedToggle = screen.getByRole('button', { name: 'Muokattu metadata' });
  const originalToggle = screen.getByRole('button', { name: 'Alkuperäinen metadata' });
  const checkboxes = [screen.getByLabelText('Fennica'), screen.getByLabelText('Yle Master')];
  const fieldContainer = (field) => field.parentElement;

  for (const field of fields) {
    expect(fieldContainer(field)).toHaveClass('col-12');
    expect(fieldContainer(field).classList.contains('col-xl-12') ||
      !fieldContainer(field).classList.contains('col-md-6')).toBe(true);
  }
  for (const checkbox of checkboxes) {
    expect(checkbox.closest('.col-6')).toBeInTheDocument();
  }

  userEvent.click(editedToggle);
  expect(fieldContainer(screen.getByLabelText('Kappaleen nimi'))).toHaveClass('col-md-6');
  expect(fieldContainer(screen.getByLabelText('Kappaleen nimi'))).not.toHaveClass('col-xl-12');
  userEvent.click(originalToggle);
  expect(fieldContainer(screen.getByLabelText('Kappaleen nimi'))).not.toHaveClass('col-xl-12');
  userEvent.click(editedToggle);
  expect(fieldContainer(screen.getByLabelText('Kappaleen nimi'))).not.toHaveClass('col-xl-12');
  userEvent.click(originalToggle);
  expect(fieldContainer(screen.getByLabelText('Kappaleen nimi'))).toHaveClass('col-xl-12');
});

test('highlights focused fields in edited and original metadata where their source is known', () => {
  const trackMetadata = mapMetadataToTrack(addItunesMarker({
    common: {
      title: 'Source title',
      composer: ['Writer One & Writer Two']
    }
  }));
  const originalMetadata = {
    common: {
      title: 'Source title',
      composer: ['Writer One & Writer Two']
    }
  };
  const { container } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      originalMetadata={originalMetadata}
      onTrackMetadataChange={jest.fn()}
    />
  );
  const getHighlightedPaths = (headingId) => {
    const section = document.getElementById(headingId).parentElement;
    return Array.from(section.querySelectorAll('.json-line-highlight'))
      .map((line) => JSON.parse(line.dataset.jsonPath));
  };

  fireEvent.focus(screen.getByLabelText('Kappaleen nimi'));
  expect(getHighlightedPaths('edited-metadata-heading')).toContainEqual(['tracks', 0, 'title']);
  expect(getHighlightedPaths('original-metadata-heading')).toContainEqual(['common', 'title']);

  fireEvent.focus(document.getElementById('metadata-author-name-1'));
  expect(getHighlightedPaths('edited-metadata-heading'))
    .toContainEqual(['tracks', 0, 'artists_publishing_ownerships', 1, 'artist', 'full_name']);
  expect(getHighlightedPaths('original-metadata-heading'))
    .toContainEqual(['common', 'composer']);

  fireEvent.focus(document.getElementById('metadata-author-role-1'));
  expect(getHighlightedPaths('edited-metadata-heading'))
    .toContainEqual(['tracks', 0, 'artists_publishing_ownerships', 1, 'rights_type', 'key']);
  expect(getHighlightedPaths('original-metadata-heading')).toHaveLength(0);
  expect(container.querySelectorAll('.json-line-highlight').length).toBeGreaterThan(0);
});

test('highlights metadata paths when a disabled field is clicked', () => {
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: {} }));
  const { container } = render(
    <MetadataView
      trackMetadata={trackMetadata}
      originalMetadata={{}}
      onTrackMetadataChange={jest.fn()}
    />
  );
  const disabledField = screen.getByRole('button', { name: 'Yle Master (disabloitu)' });

  fireEvent.click(disabledField);
  const editedSection = document.getElementById('edited-metadata-heading').parentElement;
  expect(Array.from(editedSection.querySelectorAll('.json-line-highlight'))
    .map((line) => JSON.parse(line.dataset.jsonPath)))
    .toEqual([
      ['tracks', 0, 'custom', 'yle_master'],
      ['tracks', 0, 'album', 'custom', 'yle_master']
    ]);

  fireEvent.keyDown(disabledField, { key: 'Enter' });
  expect(container.querySelectorAll('.json-line-highlight')).toHaveLength(2);
});
