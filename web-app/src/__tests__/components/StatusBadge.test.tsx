import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import StatusBadge from '@/components/StatusBadge';

describe('StatusBadge - known statuses', () => {
  it('completed → "დასრულდა" with emerald styling', () => {
    render(<StatusBadge status="completed" />);
    const badge = screen.getByText('დასრულდა');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('emerald');
  });

  it('draft → "დრაფტი" with amber styling', () => {
    render(<StatusBadge status="draft" />);
    const badge = screen.getByText('დრაფტი');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('amber');
  });

  it('in_progress → "მიმდინარე" with amber styling', () => {
    render(<StatusBadge status="in_progress" />);
    const badge = screen.getByText('მიმდინარე');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('amber');
  });

  it('overdue → "ვადაგასული"', () => {
    render(<StatusBadge status="overdue" />);
    expect(screen.getByText('ვადაგასული')).toBeInTheDocument();
  });

  it('due_today → "დღეს"', () => {
    render(<StatusBadge status="due_today" />);
    expect(screen.getByText('დღეს')).toBeInTheDocument();
  });

  it('upcoming → "დაგეგმილი"', () => {
    render(<StatusBadge status="upcoming" />);
    expect(screen.getByText('დაგეგმილი')).toBeInTheDocument();
  });
});

describe('StatusBadge - unknown status', () => {
  it('renders the raw status string as label', () => {
    render(<StatusBadge status="something_weird" />);
    expect(screen.getByText('something_weird')).toBeInTheDocument();
  });

  it('falls back to neutral styling', () => {
    render(<StatusBadge status="unknown" />);
    expect(screen.getByText('unknown').className).toContain('neutral');
  });
});

describe('StatusBadge - rendering', () => {
  it('is a plain span pill (no Mantine badge)', () => {
    const { container } = render(<StatusBadge status="completed" />);
    expect(container.querySelector('.mantine-Badge-root')).not.toBeInTheDocument();
    expect(container.querySelector('span')?.className).toContain('rounded-full');
  });
});

describe('StatusBadge - className prop', () => {
  it('forwards extra className to the pill', () => {
    render(<StatusBadge status="draft" className="my-custom-class" />);
    expect(screen.getByText('დრაფტი')).toHaveClass('my-custom-class');
  });
});
