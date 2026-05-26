import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@/test-utils';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';

const data: SuccessModalData = {
  totalCount: 8,
  safeCount: 6,
  problemCount: 2,
  inspectionName: 'დამცავი ქამრები',
  projectName: 'ტესტ პროექტი',
  itemLabel: 'ქამარი',
};

function setup(over: Partial<Parameters<typeof SuccessModal>[0]> = {}) {
  const onClose = vi.fn();
  const onGeneratePDF = vi.fn();
  render(<SuccessModal isOpen onClose={onClose} onGeneratePDF={onGeneratePDF} data={data} {...over} />);
  return { onClose, onGeneratePDF };
}

describe('SuccessModal', () => {
  it('renders nothing when closed', () => {
    render(<SuccessModal isOpen={false} onClose={() => {}} onGeneratePDF={() => {}} data={data} />);
    expect(screen.queryByText('შემოწმება დასრულდა')).not.toBeInTheDocument();
  });

  it('shows the title, names and stat counts', () => {
    setup();
    expect(screen.getByText('შემოწმება დასრულდა')).toBeInTheDocument();
    expect(screen.getByText(/დამცავი ქამრები/)).toBeInTheDocument();
    expect(screen.getByText(/ტესტ პროექტი/)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/6 კარგია/)).toBeInTheDocument();
    expect(screen.getByText(/2 პრობლემა/)).toBeInTheDocument();
  });

  it('invokes onGeneratePDF and onClose from the buttons', () => {
    const { onClose, onGeneratePDF } = setup();
    fireEvent.click(screen.getByRole('button', { name: /PDF გენერირება/ }));
    expect(onGeneratePDF).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /დახურვა/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalled();
  });
});
