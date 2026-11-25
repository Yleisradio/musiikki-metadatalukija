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

function renderApp() {
  return render(
    <NotificationProvider>
      <App />
    </NotificationProvider>
  );
}

test('renders the metadata reader and audio upload instructions', () => {
  renderApp();
  expect(screen.getByRole('heading', { name: /metatietolukija/i })).toBeInTheDocument();
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

test('keeps React in control of the three metadata tabs', () => {
  const onChange = jest.fn();
  const { rerender } = render(<MetadataTabs activeTab="main" onChange={onChange} />);
  const metadataTab = screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  const originalTab = screen.getByRole('tab', { name: 'Alkuperäinen metadata' });
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  expect(screen.getByRole('tab', { name: 'Perustiedot' })).toHaveClass('active');

  userEvent.click(metadataTab);
  expect(onChange).toHaveBeenCalledWith('metadata');
  rerender(<MetadataTabs activeTab="metadata" onChange={onChange} />);

  expect(metadataTab).toHaveAttribute('aria-selected', 'true');
  expect(metadataTab).toHaveClass('active');
  expect(screen.getByRole('tab', { name: 'Perustiedot' })).not.toHaveClass('active');

  userEvent.click(originalTab);
  expect(onChange).toHaveBeenCalledWith('original');
  rerender(<MetadataTabs activeTab="original" onChange={onChange} />);
  expect(originalTab).toHaveAttribute('aria-selected', 'true');
  expect(originalTab).toHaveClass('active');
});

test('switches between text and tree JSON inside a Bootstrap card', () => {
  const { container } = render(<JsonMetadataPanel title="Metadata" data={{ title: 'Test' }} />);
  expect(screen.getByRole('heading', { name: 'Metadata' }).closest('section')).toHaveClass('card');
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');

  userEvent.click(screen.getByRole('button', { name: 'JSON-näkymä' }));
  expect(container.querySelector('pre')).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Tekstinäkymä' }));
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');
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
  const trackMetadata = mapMetadataToTrack(metadata);
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
  expect(screen.getByLabelText('Tekijän nimi'))
    .toHaveValue('Songwriter');
  expect(screen.getByLabelText('Tekijän rooli')).toHaveValue('tekijä');
  expect(screen.getByLabelText('Levy-yhtiö')).toHaveValue('Test Label');
  expect(screen.getByLabelText('Kartuntatunnus (albumi)')).toHaveValue('');
  expect(screen.getByLabelText('Kartuntatunnus (track)')).toHaveValue('');
  expect(screen.getByLabelText('Fennica')).not.toBeChecked();
  expect(screen.getByLabelText('Yle Master')).not.toBeChecked();
  expect(screen.getByLabelText('Fennica')).toBeDisabled();
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
        rights_type: { key: 'tekijä' }
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

test('edits mapped track fields through the form', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = mapMetadataToTrack({ common: { title: 'Original' } });
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
  const trackMetadata = mapMetadataToTrack({ common: { artists: ['Original artist'] } });
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

test('renders Fennica and Yle Master disabled at the end of the form on the same row', () => {
  const trackMetadata = mapMetadataToTrack({ common: {} });
  render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={jest.fn()} />
  );

  const fennica = screen.getByLabelText('Fennica');
  const yleMaster = screen.getByLabelText('Yle Master');
  const catalogNumber = screen.getByLabelText('Kataloginumero');
  expect(fennica).toBeDisabled();
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

test('shows original metadata separately from its track.json mapping', async () => {
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
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Alkuperäinen metadata' })).toBeInTheDocument());

  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  fireEvent.change(screen.getByLabelText('Kappaleen nimi'), { target: { value: 'Edited title' } });
  userEvent.click(screen.getByRole('tab', { name: 'Perustiedot' }));
  userEvent.click(screen.getByRole('tab', { name: 'Alkuperäinen metadata' }));

  expect(screen.getByRole('heading', { name: 'Alkuperäinen metadata' }).closest('section'))
    .toHaveTextContent('"title": "Original title"');
  expect(screen.getByRole('heading', { name: 'Alkuperäinen metadata' }).closest('section'))
    .toHaveTextContent('"value": "Original native title"');
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  expect(screen.getByLabelText('Kappaleen nimi')).toHaveValue('Edited title');
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
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Alkuperäinen metadata' })).toBeInTheDocument());
  expect(screen.getAllByText('Previous track').length).toBeGreaterThan(0);

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja.'
  );
  expect(screen.queryByRole('tab', { name: 'Alkuperäinen metadata' })).not.toBeInTheDocument();
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

  await waitFor(() => expect(screen.getByRole('tab', { name: 'Alkuperäinen metadata' })).toBeInTheDocument());
  expect(screen.queryByText('Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja.'))
    .not.toBeInTheDocument();
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
