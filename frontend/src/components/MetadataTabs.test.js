import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetadataTabs from './MetadataTabs';

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
