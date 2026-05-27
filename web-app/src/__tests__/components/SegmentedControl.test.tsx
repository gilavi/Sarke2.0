import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { SegmentedControl, type SegOption } from '@/components/wizard/SegmentedControl';

const options: SegOption[] = [
  { label: 'კარგი', value: 'good', selectedBg: '#147A4F' },
  { label: 'გამოსასწ.', value: 'fix', selectedBg: '#D97706' },
  { label: 'N/A', value: 'na', selectedBg: '#6B7280' },
];

describe('SegmentedControl', () => {
  it('renders one button per option', () => {
    render(<SegmentedControl options={options} selected={null} onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('კარგი')).toBeInTheDocument();
  });

  it('calls onSelect with the option value when clicked', () => {
    const onSelect = vi.fn();
    render(<SegmentedControl options={options} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('გამოსასწ.'));
    expect(onSelect).toHaveBeenCalledWith('fix');
  });

  it('highlights only the selected option (white text on its selectedBg)', () => {
    render(<SegmentedControl options={options} selected="good" onSelect={() => {}} />);
    const selected = screen.getByText('კარგი');
    const unselected = screen.getByText('N/A');
    expect(selected).toHaveStyle({ color: 'rgb(255, 255, 255)' });
    expect(unselected).toHaveStyle({ background: 'var(--bg-hover)' });
  });

  it('shows nothing selected when selected is null', () => {
    render(<SegmentedControl options={options} selected={null} onSelect={() => {}} />);
    for (const o of options) {
      expect(screen.getByText(o.label)).toHaveStyle({ background: 'var(--bg-hover)' });
    }
  });
});
