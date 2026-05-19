import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';

describe('StatusBadge — known statuses', () => {
  it('completed → "დასრულდა" with green classes', () => {
    const { container } = render(<StatusBadge status="completed" />);
    expect(screen.getByText('დასრულდა')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-green-700');
  });

  it('draft → "დრაფტი"', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('დრაფტი')).toBeInTheDocument();
  });

  it('in_progress → "მიმდინარე"', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('მიმდინარე')).toBeInTheDocument();
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

describe('StatusBadge — unknown status', () => {
  it('renders the raw status string as label', () => {
    render(<StatusBadge status="something_weird" />);
    expect(screen.getByText('something_weird')).toBeInTheDocument();
  });

  it('falls back to neutral classes', () => {
    const { container } = render(<StatusBadge status="unknown" />);
    expect(container.firstChild).toHaveClass('text-neutral-700');
  });
});

describe('StatusBadge — showIcon prop', () => {
  it('renders an icon by default for known statuses', () => {
    const { container } = render(<StatusBadge status="completed" />);
    // lucide icon renders as an svg
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('showIcon={false} suppresses the icon', () => {
    const { container } = render(<StatusBadge status="completed" showIcon={false} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});

describe('StatusBadge — className prop', () => {
  it('forwards extra className to the wrapper span', () => {
    const { container } = render(<StatusBadge status="draft" className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
