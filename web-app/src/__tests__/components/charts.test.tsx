import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { Sparkline } from '@/components/charts/Sparkline';
import { ProgressRing } from '@/components/charts/ProgressRing';

const today = new Date().toISOString().slice(0, 10);

describe('HeatmapCalendar', () => {
  it('renders the weekday labels and the legend', () => {
    render(<HeatmapCalendar data={[{ date: today, count: 5 }]} />);
    expect(screen.getByText('ორშ')).toBeInTheDocument();
    expect(screen.getByText('კვი')).toBeInTheDocument();
    expect(screen.getByText('ნაკლები')).toBeInTheDocument();
    expect(screen.getByText('მეტი')).toBeInTheDocument();
  });

  it('shows a tooltip when a day cell is hovered', () => {
    const { container } = render(<HeatmapCalendar data={[{ date: today, count: 3 }]} />);
    const cell = container.querySelector('.cursor-default');
    expect(cell).toBeTruthy();
    fireEvent.mouseEnter(cell!);
    expect(screen.getByText(/ჩანაწერი/)).toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('renders its sized container', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} />);
    expect(container.querySelector('.h-10.w-24')).toBeInTheDocument();
  });
});

describe('ProgressRing', () => {
  it('renders an svg for a normal value', () => {
    const { container } = render(<ProgressRing value={5} max={10} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('handles max=0 without dividing by zero', () => {
    const { container } = render(<ProgressRing value={0} max={0} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
