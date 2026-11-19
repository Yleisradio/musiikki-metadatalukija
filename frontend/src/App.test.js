import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import FileUpload from './components/FileUpload';
import JsonMetadataPanel from './components/JsonMetadataPanel';
import MainMetadataView from './components/MainMetadataView';
import MetadataView from './components/MetadataView';
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
  const metadataTab = screen.getByRole('tab', { name: 'Metadatanäkymä' });
  expect(screen.getByRole('tab', { name: 'Perusnäkymä' })).toHaveClass('active');

  userEvent.click(metadataTab);
  expect(onChange).toHaveBeenCalledWith('metadata');
  rerender(<MetadataTabs activeTab="metadata" onChange={onChange} />);

  expect(metadataTab).toHaveAttribute('aria-selected', 'true');
  expect(metadataTab).toHaveClass('active');
  expect(screen.getByRole('tab', { name: 'Perusnäkymä' })).not.toHaveClass('active');

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
  expect(screen.queryByRole('heading', { name: 'Tiedoston metadata' })).not.toBeInTheDocument();
  expect(screen.getByText('Writer')).toBeInTheDocument();
});

test('edits file metadata and updates the displayed JSON', () => {
  const onMetadataChange = jest.fn();
  const metadata = { format: { duration: 12 }, common: { title: 'Test' } };
  const { rerender, container } = render(
    <MetadataView metadata={metadata} onMetadataChange={onMetadataChange} />
  );

  expect(container.querySelector('pre').textContent.indexOf('"common"'))
    .toBeLessThan(container.querySelector('pre').textContent.indexOf('"format"'));
  fireEvent.change(screen.getByLabelText('common / title'), { target: { value: 'Updated' } });

  expect(onMetadataChange).toHaveBeenLastCalledWith({
    common: { title: 'Updated' },
    format: { duration: 12 }
  });
  rerender(<MetadataView metadata={onMetadataChange.mock.lastCall[0]} onMetadataChange={onMetadataChange} />);
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Updated"');
  expect(screen.getByRole('heading', { name: 'Tiedoston metadata' }).closest('section')).toHaveClass('card');
});
