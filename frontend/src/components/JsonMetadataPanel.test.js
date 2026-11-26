import { render, screen } from '@testing-library/react';
import JsonMetadataPanel from './JsonMetadataPanel';

test('renders JSON as text without a card or view toggle', () => {
  const { container } = render(<JsonMetadataPanel title="Metadata" data={{ title: 'Test' }} headingId="metadata-heading" />);
  expect(screen.getByRole('region', { name: 'Metadata' })).not.toHaveClass('card', 'metadata-card');
  expect(container.querySelector('pre')).toHaveTextContent('"title": "Test"');
  expect(screen.queryByRole('button', { name: /JSON-näkymä|Tekstinäkymä/ })).not.toBeInTheDocument();
});
