import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import FileUpload from './components/FileUpload';
import JsonMetadataPanel from './components/JsonMetadataPanel';
import MainMetadataView from './components/MainMetadataView';
import MetadataTabs from './components/MetadataTabs';

test('renders the metadata reader and audio upload instructions', () => {
  render(<App />);
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
  const musicBrainzTab = screen.getByRole('tab', { name: 'MusicBrainz-näkymä' });
  expect(screen.getByRole('tab', { name: 'Perusnäkymä' })).toHaveClass('active');

  userEvent.click(musicBrainzTab);
  expect(onChange).toHaveBeenCalledWith('musicbrainz');
  rerender(<MetadataTabs activeTab="musicbrainz" onChange={onChange} />);

  expect(musicBrainzTab).toHaveAttribute('aria-selected', 'true');
  expect(musicBrainzTab).toHaveClass('active');
  expect(screen.getByRole('tab', { name: 'Perusnäkymä' })).not.toHaveClass('active');
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

test('renders summary and artist metadata in responsive Bootstrap cards', () => {
  render(
    <MainMetadataView
      cleanData={{ title: 'Test', performers: 'Artist', songwriters: ['Writer'] }}
      artistDetails={[{ id: 'artist-1', name: 'Artist', type: 'Person' }]}
      metadata={{ title: 'Test' }}
    />
  );

  for (const title of ['Yleistiedot', 'Esittäjän lisätiedot', 'Tiedoston metadata']) {
    expect(screen.getByRole('heading', { name: title }).closest('section')).toHaveClass('card');
  }
  expect(screen.getByText('Writer')).toBeInTheDocument();
});
