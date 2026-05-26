import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { screen, fireEvent, render } from '@/test-utils';
import { CompletedBanner } from '@/features/inspections/equipment/components/CompletedBanner';
import { InspectionPdfOverlay } from '@/features/inspections/equipment/components/InspectionPdfOverlay';

const renderInRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CompletedBanner', () => {
  it('renders the completion text + back link + PDF button', () => {
    renderInRouter(<CompletedBanner onViewPdf={() => {}} />);
    expect(screen.getByText('შემოწმების აქტი დასრულებულია ✓')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF ნახვა/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /სიაში დაბრუნება/ })).toBeInTheDocument();
  });

  it('fires onViewPdf when the PDF button is clicked', () => {
    const onViewPdf = vi.fn();
    renderInRouter(<CompletedBanner onViewPdf={onViewPdf} />);
    fireEvent.click(screen.getByRole('button', { name: /PDF ნახვა/ }));
    expect(onViewPdf).toHaveBeenCalled();
  });

  it('honors a custom listHref', () => {
    renderInRouter(<CompletedBanner onViewPdf={() => {}} listHref="/projects/p1" />);
    expect(screen.getByRole('link', { name: /სიაში დაბრუნება/ })).toHaveAttribute('href', '/projects/p1');
  });
});

describe('InspectionPdfOverlay', () => {
  it('renders close + print buttons and the iframe with the src', () => {
    const { container } = render(
      <InspectionPdfOverlay src="#/bobcat/i1/print?preview=1" onClose={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /დახურვა/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ბეჭდვა' })).toBeInTheDocument();
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toBe('#/bobcat/i1/print?preview=1');
  });

  it('fires onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<InspectionPdfOverlay src="x" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /დახურვა/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
