import { render, screen } from '@testing-library/react';
import MainMetadataView from './MainMetadataView';

test('hides the album art frame until an image is available', () => {
  const cleanData = { songwriters: [] };
  const { rerender } = render(<MainMetadataView cleanData={cleanData} />);
  expect(screen.queryByAltText('Albumin kansikuva')).not.toBeInTheDocument();

  rerender(
    <MainMetadataView cleanData={cleanData} albumArt="data:image/jpeg;base64,abc" />
  );
  expect(screen.getByAltText('Albumin kansikuva')).toBeInTheDocument();
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
