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

test('keeps React in control of Bootstrap tab selection', () => {
  const onChange = jest.fn();
  const { rerender } = render(<MetadataTabs activeTab="main" onChange={onChange} />);
  const musicBrainzTab = screen.getByRole('tab', { name: 'MusicBrainz' });
  const metadataTab = screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  const originalTab = screen.getByRole('tab', { name: 'Alkuperäinen metadata' });
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

  userEvent.click(musicBrainzTab);
  expect(onChange).toHaveBeenCalledWith('musicbrainz');
  rerender(<MetadataTabs activeTab="musicbrainz" onChange={onChange} />);

  expect(musicBrainzTab).toHaveAttribute('aria-selected', 'true');
  expect(musicBrainzTab).toHaveClass('active');
  expect(screen.getByRole('tab', { name: 'Perustiedot' })).not.toHaveClass('active');
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

test('renders summary and artist metadata in the main view', () => {
  render(
    <MainMetadataView
      cleanData={{ title: 'Test', performers: 'Artist', songwriters: ['Writer'] }}
      artistDetails={[{ id: 'artist-1', name: 'Artist', type: 'Person' }]}
    />
  );

  for (const title of ['Yleistiedot', 'Esittäjän lisätiedot']) {
    expect(screen.getByRole('heading', { name: title }).closest('section')).toHaveClass('card');
  }
  expect(screen.getByRole('heading', { name: 'Yleistiedot' }).closest('.col-xl-6')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Esittäjän lisätiedot' }).closest('.col-xl-6')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tiedoston metadata' })).not.toBeInTheDocument();
  expect(screen.getByText('Writer')).toBeInTheDocument();
});

test('maps file metadata to the track.json shape', () => {
  const metadata = {
    format: { duration: 192.4 },
    common: {
      title: 'Test',
      artists: ['Artist One', 'Artist Two'],
      album: 'Album',
      isrc: 'US1234567890',
      date: '2024-06-01',
      track: { no: 3 },
      composer: ['Songwriter'],
      genre: ['Rock'],
      language: 'eng',
      year: 2024
    }
  };
  const { container } = render(
    <MetadataView
      trackMetadata={mapMetadataToTrack(metadata)}
      onTrackMetadataChange={jest.fn()}
    />
  );

  expect(container.querySelector('section')).toHaveClass('card');
  expect(screen.getByLabelText('title')).toHaveValue('Test');
  expect(screen.getByLabelText('duration')).toHaveValue(192.4);
  expect(screen.getByLabelText('display_artists / 0')).toHaveValue('Artist One');
  expect(screen.getByLabelText('album / title')).toHaveValue('Album');
  expect(screen.getByLabelText('track_number')).toHaveValue(3);
  expect(screen.getByLabelText('artists_publishing_ownerships / 0 / artist / full_name'))
    .toHaveValue('Songwriter');
  expect(screen.getByLabelText('custom / publication_year')).toHaveValue('2024');
  expect(container.querySelectorAll('details')).toHaveLength(0);
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');
  expect(screen.queryByRole('heading', { name: /track\.json/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'JSON-näkymä' })).not.toBeInTheDocument();
});

test('edits mapped track fields through the form', () => {
  const onTrackMetadataChange = jest.fn();
  const trackMetadata = { title: 'Original', custom: { genre: ['Rock'] } };
  const { rerender, container } = render(
    <MetadataView trackMetadata={trackMetadata} onTrackMetadataChange={onTrackMetadataChange} />
  );

  fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Edited' } });
  expect(onTrackMetadataChange).toHaveBeenLastCalledWith({
    title: 'Edited',
    custom: { genre: ['Rock'] }
  });
  rerender(
    <MetadataView
      trackMetadata={onTrackMetadataChange.mock.lastCall[0]}
      onTrackMetadataChange={onTrackMetadataChange}
    />
  );
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Edited"');
});

test('shows original metadata separately from its track.json mapping', async () => {
  parseBlob.mockResolvedValue({
    common: { title: 'Original title' },
    format: { duration: 12 },
    native: { id3v2: [{ id: 'TIT2', value: 'Original native title' }] }
  });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
  );
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Alkuperäinen metadata' })).toBeInTheDocument());

  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Edited title' } });
  userEvent.click(screen.getByRole('tab', { name: 'Perustiedot' }));
  userEvent.click(screen.getByRole('tab', { name: 'Alkuperäinen metadata' }));

  expect(screen.getByRole('heading', { name: 'Alkuperäinen metadata' }).closest('section'))
    .toHaveTextContent('"title": "Original title"');
  expect(screen.getByRole('heading', { name: 'Alkuperäinen metadata' }).closest('section'))
    .toHaveTextContent('"value": "Original native title"');
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  expect(screen.getByLabelText('title')).toHaveValue('Edited title');
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
