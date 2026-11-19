import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the metadata reader and audio upload instructions', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /metatietolukija/i })).toBeInTheDocument();
  expect(screen.getByText(/pudota audiotiedosto tai klikkaa tästä/i)).toBeInTheDocument();
});
