import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { render, screen } from '@/test-utils';
import { StatCard } from '@/components/charts/StatCard';

describe('StatCard', () => {
  it('renders the title and value', () => {
    render(<StatCard title="შემოწმებები" value={42} icon={Activity} />);
    expect(screen.getByText('შემოწმებები')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('wraps the card in a link when href is provided', () => {
    render(
      <MemoryRouter>
        <StatCard title="პროექტები" value={3} icon={Activity} href="/projects" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/projects');
  });

  it('renders a trend indicator when trend props are present', () => {
    render(
      <StatCard title="PDF" value={10} icon={Activity} trendCurrent={10} trendPrevious={5} trendLabel="ამ თვეში" />,
    );
    expect(screen.getByText(/ამ თვეში/)).toBeInTheDocument();
  });
});
