import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { screen, fireEvent, render } from '@/test-utils';
import SettingsModal from '@/components/SettingsModal';
import DeleteButton from '@/components/DeleteButton';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { WizardFooter } from '@/components/wizard/WizardFooter';
import { useWizardFlow } from '@/components/wizard/useWizardFlow';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('SettingsModal', () => {
  it('renders the settings panel when open', () => {
    render(<SettingsModal open onClose={() => {}} />);
    expect(screen.getByText('პარამეტრები')).toBeInTheDocument();
    expect(screen.getByText('გარეგნობა')).toBeInTheDocument();
    expect(screen.getByText('მუქი რეჟიმი')).toBeInTheDocument();
    expect(screen.getByText('ენა')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<SettingsModal open={false} onClose={() => {}} />);
    expect(screen.queryByText('მუქი რეჟიმი')).not.toBeInTheDocument();
  });
});

describe('DeleteButton', () => {
  it('renders the delete trigger with the default label', () => {
    render(<DeleteButton onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: /წაშლა/ })).toBeInTheDocument();
  });

  it('honors a custom label and isPending', () => {
    render(<DeleteButton onDelete={vi.fn()} isPending label="წაშლა მუდმივად" />);
    const btn = screen.getByRole('button', { name: /წაშლა მუდმივად/ });
    expect(btn).toBeDisabled();
  });
});

describe('WizardHeader', () => {
  it('renders the inspection and step names with the close button', () => {
    const onClose = vi.fn();
    render(
      <WizardHeader
        projectName="პროექტი"
        inspectionName="ციცხვიანი დამტვირთველი"
        stepName="ზოგადი ინფორმაცია"
        showProgress
        progressPercent={50}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('პროექტი')).toBeInTheDocument();
    expect(screen.getByText('ციცხვიანი დამტვირთველი')).toBeInTheDocument();
    expect(screen.getByText('ზოგადი ინფორმაცია')).toBeInTheDocument();
  });
});

describe('WizardFooter', () => {
  it('fires onNext when the primary button is clicked', () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    render(<WizardFooter onBack={onBack} onNext={onNext} nextLabel="შემდეგი" />);
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    expect(onNext).toHaveBeenCalled();
  });
});

describe('useWizardFlow', () => {
  it('starts at step 0 with isFirst true', () => {
    const { result } = renderHook(() => useWizardFlow(3));
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
  });

  it('advances and rewinds with goNext / goPrev', () => {
    const { result } = renderHook(() => useWizardFlow(3));
    act(() => result.current.goNext());
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.direction).toBe(1);
    act(() => result.current.goNext());
    expect(result.current.stepIndex).toBe(2);
    expect(result.current.isLast).toBe(true);
    act(() => result.current.goNext()); // clamps at last
    expect(result.current.stepIndex).toBe(2);
    act(() => result.current.goPrev());
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.direction).toBe(-1);
  });

  it('setStep jumps to an arbitrary step and infers direction', () => {
    const { result } = renderHook(() => useWizardFlow(5));
    act(() => result.current.setStep(3));
    expect(result.current.stepIndex).toBe(3);
    expect(result.current.direction).toBe(1);
    act(() => result.current.setStep(1));
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.direction).toBe(-1);
  });
});
