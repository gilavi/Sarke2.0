import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@/test-utils';
import { HarnessChecklist } from '@/components/inspections/HarnessChecklist';

describe('HarnessChecklist', () => {
  it('renders the active item header and each status column', () => {
    render(
      <HarnessChecklist
        itemLabel="ქამარი"
        activeIdx={0}
        activeRow="ქამარი 1"
        statusCols={['ბუდე', 'ღვედი', 'ცეცხლი']}
        values={{}}
        naSet={new Set()}
        hasComment={false}
        onSelect={() => {}}
        onComment={() => {}}
      />,
    );
    expect(screen.getByText('ქამარი 1')).toBeInTheDocument();
    expect(screen.getByText('შეამოწმეთ ყველა პუნქტი')).toBeInTheDocument();
    // Each status column rendered as a row.
    expect(screen.getByText('ბუდე')).toBeInTheDocument();
    expect(screen.getByText('ღვედი')).toBeInTheDocument();
    expect(screen.getByText('ცეცხლი')).toBeInTheDocument();
  });

  it('shows the comment textarea when hasComment is true', () => {
    render(
      <HarnessChecklist
        itemLabel="ქამარი"
        activeIdx={0}
        activeRow="ქამარი 1"
        statusCols={['ბუდე']}
        values={{ 'ქამარი 1': { კომენტარი: 'OK' } }}
        naSet={new Set()}
        hasComment
        onSelect={() => {}}
        onComment={() => {}}
      />,
    );
    expect(screen.getByText('კომენტარი')).toBeInTheDocument();
  });

  it('invokes onSelect when a status segment is clicked', () => {
    const onSelect = vi.fn();
    render(
      <HarnessChecklist
        itemLabel="ქამარი"
        activeIdx={0}
        activeRow="ქამარი 1"
        statusCols={['ბუდე']}
        values={{}}
        naSet={new Set()}
        hasComment={false}
        onSelect={onSelect}
        onComment={() => {}}
      />,
    );
    // SegmentedControl labels: 'კი' / 'არა' / 'N/A'.
    screen.getByText('კი').click();
    expect(onSelect).toHaveBeenCalledWith('ქამარი 1', 'ბუდე', 'ok');
  });
});
