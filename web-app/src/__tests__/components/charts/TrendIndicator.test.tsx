import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendIndicator } from '@/components/charts/TrendIndicator';

describe('TrendIndicator', () => {
  it('shows positive percentage and green text when current > previous', () => {
    const { container } = render(
      <TrendIndicator current={120} previous={100} label="vs last month" />,
    );
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toHaveClass('text-brand-600');
    // ArrowUp svg should be present
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows negative percentage and red text when current < previous', () => {
    render(<TrendIndicator current={80} previous={100} label="vs last month" />);
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toHaveClass('text-red-600');
  });

  it('shows 0% when previous is 0 (avoids division by zero)', () => {
    render(<TrendIndicator current={50} previous={0} label="baseline" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 0% when current equals previous', () => {
    render(<TrendIndicator current={100} previous={100} label="no change" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the label prop', () => {
    render(<TrendIndicator current={10} previous={5} label="vs last week" />);
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });
});
