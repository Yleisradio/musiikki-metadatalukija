import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseBlob } from 'music-metadata-browser';
import App from './App';
import FileUpload from './components/FileUpload';
import JsonMetadataPanel from './components/JsonMetadataPanel';
import MainMetadataView from './components/MainMetadataView';
import MetadataView from './components/MetadataView';
import MetadataTabs from './components/MetadataTabs';
import { NotificationProvider } from './components/Notifications';
import { mapMetadataToTrack } from './utils/trackMetadata';

jest.mock('music-metadata-browser', () => ({ parseBlob: jest.fn() }));

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

function renderApp() {
  return render(
    <NotificationProvider>
      <App />
    </NotificationProvider>
  );
}

function addItunesMarker(metadata) {
  return {
    ...metadata,
    native: {
      ...metadata.native,
      mp4: [...(metadata.native?.mp4 ?? []), { id: 'cnID', value: 12345 }]
    }
  };
}

test('renders the metadata reader and audio upload instructions', () => {
  renderApp();
  expect(screen.getByRole('heading', { name: /metadatalukija/i })).toBeInTheDocument();
  expect(screen.getByText(/pudota audiotiedosto tai klikkaa tästä/i)).toBeInTheDocument();
});

test('selects an audio file through the styled upload area', async () => {
  const onFileSelected = jest.fn();
  render(<FileUpload fileName="test.mp3" onFileSelected={onFileSelected} />);
  const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

  userEvent.upload(screen.getByLabelText('Valitse audiotiedosto'), file);

  await waitFor(() => expect(onFileSelected).toHaveBeenCalledWith(file));
  expect(screen.getByText('test.mp3')).toBeInTheDocument();
});

test('hides the album art frame until an image is available', () => {
  const cleanData = { songwriters: [] };
  const { rerender } = render(<MainMetadataView cleanData={cleanData} />);
  expect(screen.queryByAltText('Albumin kansikuva')).not.toBeInTheDocument();

  rerender(
    <MainMetadataView cleanData={cleanData} albumArt="data:image/jpeg;base64,abc" />
  );
  expect(screen.getByAltText('Albumin kansikuva')).toBeInTheDocument();
});

test('keeps React in control of the two metadata tabs', () => {
  const onChange = jest.fn();
  const { rerender } = render(<MetadataTabs activeTab="main" onChange={onChange} />);
  const metadataTab = screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(screen.queryByRole('tab', { name: 'Alkuperäinen metadata' })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Perustiedot' })).toHaveClass('active');

  userEvent.click(metadataTab);
  expect(onChange).toHaveBeenCalledWith('metadata');
  rerender(<MetadataTabs activeTab="metadata" onChange={onChange} />);

  expect(metadataTab).toHaveAttribute('aria-selected', 'true');
  expect(metadataTab).toHaveClass('active');
  expect(screen.getByRole('tab', { name: 'Perustiedot' })).not.toHaveClass('active');

  userEvent.click(screen.getByRole('tab', { name: 'Perustiedot' }));
  expect(onChange).toHaveBeenCalledWith('main');
});

test('renders JSON as text without a card or view toggle', () => {
  const { container } = render(<JsonMetadataPanel title="Metadata" data={{ title: 'Test' }} headingId="metadata-heading" />);
  expect(screen.getByRole('region', { name: 'Metadata' })).not.toHaveClass('card', 'metadata-card');
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');
  expect(screen.queryByRole('button', { name: /JSON-näkymä|Tekstinäkymä/ })).not.toBeInTheDocument();
});

test('renders summary metadata and album art in the main view', () => {
  render(
    <MainMetadataView
      cleanData={{ title: 'Test', performers: 'Artist', songwriters: ['Writer'] }}
      albumArt="data:image/jpeg;base64,abc"
    />
  );

  expect(screen.getByRole('heading', { name: 'Yleistiedot' }).closest('section')).toHaveClass('card');
  expect(screen.getByRole('heading', { name: 'Yleistiedot' }).closest('.col-xl-6')).toBeInTheDocument();
  expect(screen.getByAltText('Albumin kansikuva')).toBeInTheDocument();
  expect(screen.queryByText('Esittäjän lisätiedot')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tiedoston metadata' })).not.toBeInTheDocument();
  expect(screen.getByText('Writer')).toBeInTheDocument();
});

test('maps file metadata to the album and track fields required for sending', () => {
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
  expect(screen.getByLabelText('Rooli')).toHaveValue('Tekijä');
  expect(screen.getByLabelText('Levy-yhtiö')).toHaveValue('Test Label');
  expect(screen.getByLabelText('Kataloginumero')).toHaveValue('Ei kataloginumeroa');
  expect(screen.getByLabelText('Kartuntatunnus (albumi)')).toHaveValue('');
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toHaveValue('');
  expect(screen.getByLabelText('Fennica')).not.toBeChecked();
  expect(screen.getByLabelText('Yle Master')).not.toBeChecked();
  expect(screen.getByLabelText('Fennica')).toBeEnabled();
  expect(screen.getByLabelText('Yle Master')).toBeDisabled();
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
        rights_type: { key: 'Tekijä' }
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
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');
});

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
  expect(document.getElementById('metadata-author-role-0')).toHaveValue('Tekijä');
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
  expect(document.getElementById('metadata-author-role-3')).toHaveValue('Tekijä');
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
    target: { value: 'Säveltäjä' }
  });
  const updatedAuthors = onTrackMetadataChange.mock.lastCall[0].tracks[0].artists_publishing_ownerships;
  expect(updatedAuthors).toHaveLength(4);
  expect(updatedAuthors[3]).toEqual({
    artist: { full_name: 'New Writer' },
    rights_type: { key: 'Säveltäjä' }
  });
});

test('maps only metadata with a recognized source marker', () => {
  expect(mapMetadataToTrack({ common: { title: 'Unrecognized source' } })).toBeNull();
  expect(mapMetadataToTrack(addItunesMarker({ common: { title: 'iTunes source' } })))
    .toMatchObject({ tracks: [{ title: 'iTunes source' }] });
});

test('edits mapped track fields through the form', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack(addItunesMarker({ common: { title: 'Original' } }));
  const { rerender, container } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );

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

test('shows editable, mapped and original metadata side by side and keeps original unchanged', async () => {
  parseBlob.mockResolvedValue({
    common: { title: 'Original title' },
    format: { duration: 12 },
    native: {
      id3v2: [{ id: 'TIT2', value: 'Original native title' }],
      mp4: [{ id: 'cnID', value: 12345 }]
    }
  });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
  );
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' })).toBeInTheDocument());

  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  expect(screen.queryByRole('tab', { name: 'Alkuperäinen metadata' })).not.toBeInTheDocument();
  const formColumn = screen.getByLabelText('Kappaleen nimi').closest('.col-xl-4');
  const mappedColumn = screen.getByRole('heading', { name: 'Muokattu metadata' }).closest('.col-xl-4');
  const originalColumn = screen.getByRole('heading', { name: 'Alkuperäinen metadata' }).closest('.col-xl-4');
  expect(formColumn).toHaveClass('col-12');
  expect(mappedColumn).toHaveClass('col-12');
  expect(originalColumn).toHaveClass('col-12');
  expect(new Set([formColumn, mappedColumn, originalColumn]).size).toBe(3);
  expect(formColumn.parentElement).toBe(mappedColumn.parentElement);
  expect(formColumn.parentElement).toBe(originalColumn.parentElement);
  const mappedSection = mappedColumn.querySelector('section');
  const originalSection = originalColumn.querySelector('section');
  expect(mappedSection.className).toBe(originalSection.className);
  expect(originalSection).not.toHaveClass('card', 'card-body', 'metadata-card');
  expect(mappedSection.querySelector('h2').className).toBe(originalSection.querySelector('h2').className);
  expect(mappedSection.querySelector('.json-content').className)
    .toBe(originalSection.querySelector('.json-content').className);
  expect(mappedSection.querySelector('pre').className).toBe(originalSection.querySelector('pre').className);

  fireEvent.change(screen.getByLabelText('Kappaleen nimi'), { target: { value: 'Edited title' } });
  expect(mappedColumn).toHaveTextContent('"title": "Edited title"');
  expect(originalColumn).toHaveTextContent('"title": "Original title"');
  expect(originalColumn).toHaveTextContent('"value": "Original native title"');
  expect(originalColumn.querySelector('button')).not.toBeInTheDocument();

  const editedToggle = screen.getByRole('button', { name: 'Muokattu metadata' });
  const originalToggle = screen.getByRole('button', { name: 'Alkuperäinen metadata' });
  expect(editedToggle).toHaveAttribute('aria-pressed', 'true');
  expect(originalToggle).toHaveAttribute('aria-pressed', 'true');
  expect(editedToggle).toHaveClass('btn-primary');
  expect(originalToggle).toHaveClass('btn-primary');
  userEvent.click(editedToggle);
  expect(editedToggle).toHaveAttribute('aria-pressed', 'false');
  expect(editedToggle).toHaveClass('btn-outline-secondary');
  expect(editedToggle).not.toHaveClass('btn-primary');
  expect(screen.queryByRole('heading', { name: 'Muokattu metadata' })).not.toBeInTheDocument();
  expect(formColumn).toHaveClass('col-xl-6');
  expect(originalColumn).toHaveClass('col-xl-6');
  fireEvent.change(screen.getByLabelText('Kappaleen nimi'), { target: { value: 'Changed while hidden' } });

  userEvent.click(originalToggle);
  expect(originalToggle).toHaveAttribute('aria-pressed', 'false');
  expect(originalToggle).toHaveClass('btn-outline-secondary');
  expect(screen.queryByRole('heading', { name: 'Alkuperäinen metadata' })).not.toBeInTheDocument();
  expect(formColumn).toHaveClass('col-xl-12');

  userEvent.click(editedToggle);
  expect(editedToggle).toHaveClass('btn-primary');
  expect(editedToggle).not.toHaveClass('btn-outline-secondary');
  expect(formColumn).toHaveClass('col-xl-6');
  expect(screen.getByRole('heading', { name: 'Muokattu metadata' }).closest('.col-xl-6'))
    .toHaveTextContent('"title": "Changed while hidden"');

  userEvent.click(screen.getByRole('tab', { name: 'Perustiedot' }));
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  expect(screen.getByLabelText('Kappaleen nimi')).toHaveValue('Changed while hidden');
  expect(screen.getByRole('button', { name: 'Alkuperäinen metadata' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByRole('heading', { name: 'Alkuperäinen metadata' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Alkuperäinen metadata' }));
  expect(formColumn).toHaveClass('col-xl-4');
  expect(screen.getByRole('heading', { name: 'Alkuperäinen metadata' }).closest('.col-xl-4'))
    .toHaveTextContent('"title": "Original title"');
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

test('notifies when the audio file has no iTunes metadata markers', async () => {
  parseBlob
    .mockResolvedValueOnce({
      common: { title: 'Previous track' },
      native: { mp4: [{ id: 'cnID', value: 12345 }] }
    })
    .mockResolvedValueOnce({
      common: { title: 'Test' },
      native: { id3v2: [{ id: 'TIT2', value: 'Test' }] }
    });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'previous.m4a', { type: 'audio/mp4' })
  );
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' })).toBeInTheDocument());
  expect(screen.getAllByText('Previous track').length).toBeGreaterThan(0);

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja.'
  );
  expect(screen.queryByRole('tab', { name: 'Metadatan muokkaus ja lähetys' })).not.toBeInTheDocument();
  expect(screen.queryByText('Previous track')).not.toBeInTheDocument();
  expect(screen.queryByText('Test')).not.toBeInTheDocument();
});

test('does not notify when the audio file has iTunes metadata markers', async () => {
  parseBlob.mockResolvedValue({
    common: { title: 'Test' },
    native: { mp4: [{ id: 'cnID', value: 12345 }] }
  });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.m4a', { type: 'audio/mp4' })
  );

  await waitFor(() => expect(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' })).toBeInTheDocument());
  expect(screen.queryByText('Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja.'))
    .not.toBeInTheDocument();
});

test('sends the edited metadata to the backend and reports success', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201 });
  parseBlob.mockResolvedValue({
    common: { title: 'Original title' },
    native: { mp4: [{ id: 'cnID', value: 12345 }] }
  });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.m4a', { type: 'audio/mp4' })
  );
  await screen.findByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  fireEvent.change(screen.getByLabelText('Kappaleen nimi'), { target: { value: 'Edited title' } });
  userEvent.click(screen.getByRole('button', { name: 'Lähetä' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: expect.stringContaining('"title":"Edited title"')
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('Metadata lähetetty onnistuneesti.');
});

test('clarifies that metadata is only logged when no upstream is configured', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202 });
  parseBlob.mockResolvedValue({
    common: { title: 'Test' },
    native: { mp4: [{ id: 'cnID', value: 12345 }] }
  });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.m4a', { type: 'audio/mp4' })
  );
  await screen.findByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  userEvent.click(screen.getByRole('button', { name: 'Lähetä' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Metadata vastaanotettiin ja kirjattiin backendin lokiin, mutta sitä ei tallenneta pysyvästi.'
  );
});

test('reports backend errors when sending metadata fails', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 });
  parseBlob.mockResolvedValue({
    common: { title: 'Test' },
    native: { mp4: [{ id: 'cnID', value: 12345 }] }
  });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.m4a', { type: 'audio/mp4' })
  );
  await screen.findByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  userEvent.click(screen.getByRole('button', { name: 'Lähetä' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Metadatan lähetys epäonnistui (HTTP 502).'
  );
});

test('notifies the user when metadata cannot be read', async () => {
  parseBlob.mockRejectedValue(new Error('Invalid audio file'));
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['invalid'], 'broken.mp3', { type: 'audio/mpeg' })
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Tiedoston metatietoja ei voitu lukea. Tarkista tiedosto ja yritä uudelleen.'
  );
});
