import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseBlob } from 'music-metadata-browser';
import App from './App';
import { NotificationProvider } from './components/Notifications';
import { addItunesMarker } from './testUtils/metadataFixtures';

jest.mock('music-metadata-browser', () => ({ parseBlob: jest.fn() }));

const originalFetch = global.fetch;
beforeEach(() => {
  parseBlob.mockReset();
});
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

test('renders the metadata reader and audio upload instructions', () => {
  renderApp();
  expect(screen.getByRole('heading', { name: /metadatalukija/i })).toBeInTheDocument();
  expect(screen.getByText(/pudota audiotiedosto tai klikkaa tästä/i)).toBeInTheDocument();
});

test('updates the track catalog number as the album ID is typed or pasted', async () => {
  const metadata = addItunesMarker({
    common: { title: 'Test', track: { no: 3 } }
  });
  parseBlob.mockResolvedValue(metadata);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201 });
  renderApp();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'test.m4a', { type: 'audio/mp4' })
  );
  await screen.findByRole('tab', { name: 'Metadatan muokkaus ja lähetys' });
  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));

  const albumId = screen.getByLabelText('Kartuntatunnus (albumi)');
  const trackId = screen.getByLabelText('Kartuntatunnus (track)');
  for (const [character, expected] of [['A', 'A-03'], ['B', 'AB-03'], ['1', 'AB1-03']]) {
    userEvent.type(albumId, character);
    expect(trackId).toHaveValue(expected);
  }

  userEvent.clear(albumId);
  expect(trackId).toHaveValue('');
  userEvent.paste(albumId, 'PASTED-123');
  expect(albumId).toHaveValue('PASTED-123');
  expect(trackId).toHaveValue('PASTED-123-03');
  expect(screen.getByLabelText('Uranumero')).toHaveValue(3);

  userEvent.click(screen.getByRole('button', { name: 'Lähetä' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  const sentTrack = JSON.parse(global.fetch.mock.calls[0][1].body).tracks[0];
  expect(sentTrack.album.custom.CustomID).toBe('PASTED-123');
  expect(sentTrack.custom.CustomID).toBe('PASTED-123-03');
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
  expect(mappedColumn).toHaveClass('metadata-panel-sticky');
  expect(originalColumn).toHaveClass('metadata-panel-sticky');
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

test('preserves summary source priorities and hides image bytes in the original JSON', async () => {
  parseBlob.mockResolvedValue(addItunesMarker({
    common: {
      title: '  Source title  ',
      artists: ['Artist One', 'Artist Two'],
      composer: ['Writer One & Writer Two'],
      year: 2001,
      isrc: 'COMMON123456',
      label: 'Common label',
      picture: [{ format: 'image/png', data: new Uint8Array([65, 66, 67]) }]
    },
    native: { mp4: [{ id: 'cprt', value: '℗ 1999 Native label' }] },
    format: { duration: 125 }
  }));
  renderApp();
  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['audio'], 'cover.m4a', { type: 'audio/mp4' })
  );

  expect(await screen.findByAltText('Albumin kansikuva'))
    .toHaveAttribute('src', 'data:image/png;base64,QUJD');
  expect(screen.getByText('Native label')).toBeInTheDocument();
  expect(screen.getByText('2001')).toBeInTheDocument();
  expect(screen.getByText('COMMON123456')).toBeInTheDocument();
  expect(screen.getByText('2:05')).toBeInTheDocument();

  userEvent.click(screen.getByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
  expect(screen.getByLabelText('Levy-yhtiö')).toHaveValue('Common label');
  const original = screen.getByRole('region', { name: 'Alkuperäinen metadata' });
  expect(original).toHaveTextContent('Image binary data is very long so it is hidden for convenience');
  expect(original.textContent).toContain('"title": "  Source title  "');
  expect(original).not.toHaveTextContent('"fileInfo"');
});

test('uses native fallbacks and clears old results while another file is being read', async () => {
  let finishReading;
  parseBlob
    .mockResolvedValueOnce(addItunesMarker({
      common: { copyright: '© 2010 Common copyright' },
      native: { mp4: [
        { id: 'cprt', value: '℗ 1998 Native label' },
        { id: 'xid ', value: 'isrc:US1234567890' },
        { id: 'plID', value: 987 }
      ] }
    }))
    .mockImplementationOnce(() => new Promise((resolve) => { finishReading = resolve; }));
  renderApp();
  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['first'], 'first.m4a', { type: 'audio/mp4' })
  );
  expect(await screen.findByText('1998')).toBeInTheDocument();
  expect(screen.getByText('Native label')).toBeInTheDocument();
  expect(screen.getByText('US1234567890')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tuntematon otsikko' })).toHaveAttribute('href', 'https://music.apple.com/song/12345');
  expect(screen.getByText('Tuntematon albumi')).toHaveAttribute('href', 'https://music.apple.com/album/987');
  expect(screen.getByText('Tuntematon esittäjä')).toBeInTheDocument();
  expect(screen.getByText('Tuntematon genre')).toBeInTheDocument();

  userEvent.upload(
    screen.getByLabelText('Valitse audiotiedosto'),
    new File(['next'], 'next.m4a', { type: 'audio/mp4' })
  );
  await waitFor(() => expect(parseBlob).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  expect(screen.queryByText('Native label')).not.toBeInTheDocument();
  finishReading(addItunesMarker({ common: {} }));
  expect(await screen.findByText('Tuntematon vuosi')).toBeInTheDocument();
  expect(screen.getByText('Tuntematon levymerkki')).toBeInTheDocument();
  expect(screen.getByText('Tuntematon ISRC')).toBeInTheDocument();
});

test('disables sending until a pending request completes and allows retry after a network error', async () => {
  let rejectSending;
  global.fetch = jest.fn()
    .mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSending = reject; }))
    .mockResolvedValueOnce({ ok: true, status: 201 });
  parseBlob.mockResolvedValue(addItunesMarker({ common: { title: 'Test' } }));
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    renderApp();
    userEvent.upload(
      screen.getByLabelText('Valitse audiotiedosto'),
      new File(['audio'], 'test.m4a', { type: 'audio/mp4' })
    );
    userEvent.click(await screen.findByRole('tab', { name: 'Metadatan muokkaus ja lähetys' }));
    userEvent.click(screen.getByRole('button', { name: 'Lähetä' }));
    expect(screen.getByRole('button', { name: 'Lähetetään...' })).toBeDisabled();
    userEvent.click(screen.getByRole('button', { name: 'Lähetetään...' }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    rejectSending(new Error('Network unavailable'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByRole('button', { name: 'Lähetä' })).toBeEnabled();
    expect(consoleError).toHaveBeenCalledWith('Error sending metadata:', expect.any(Error));
    userEvent.click(screen.getByRole('button', { name: 'Lähetä' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Metadata lähetetty onnistuneesti.');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  } finally {
    consoleError.mockRestore();
  }
});
