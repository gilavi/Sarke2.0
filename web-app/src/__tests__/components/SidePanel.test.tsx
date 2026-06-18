/**
 * SidePanel (48% covered) - the SafetyGuide side panel. Exercises the open
 * vs closed states, selected-part rendering, and the "next topic" + clear
 * actions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

import SidePanel from '@/components/SidePanel';
import { useSafetyStore } from '@/store/safetyStore';
import { safetyTips } from '@/data/safetyTips';

beforeEach(() => {
  // Reset store between tests.
  useSafetyStore.setState({
    selectedPartId: null, hoveredPartId: null, isPanelOpen: true, cameraTarget: null,
  });
});

describe('SidePanel', () => {
  it('renders the empty state when no part is selected', () => {
    render(<SidePanel />);
    expect(screen.getByText(/აირჩიეთ კონსტრუქციული ნაწილი/)).toBeInTheDocument();
    expect(screen.getByText(/ინტერაქტიული 3D უსაფრთხოების სახელმძღვანელო/)).toBeInTheDocument();
  });

  it('renders the toggle button when panel is closed', () => {
    useSafetyStore.setState({ isPanelOpen: false });
    render(<SidePanel />);
    expect(screen.getByLabelText('უსაფრთხოების პანელის გახსნა')).toBeInTheDocument();
  });

  it('clicking the toggle button opens the panel', () => {
    useSafetyStore.setState({ isPanelOpen: false });
    render(<SidePanel />);
    fireEvent.click(screen.getByLabelText('უსაფრთხოების პანელის გახსნა'));
    expect(useSafetyStore.getState().isPanelOpen).toBe(true);
  });

  it('renders the selected tip details when a part is selected', () => {
    const firstTipId = Object.keys(safetyTips)[0];
    useSafetyStore.setState({ selectedPartId: firstTipId, isPanelOpen: true });
    render(<SidePanel />);
    const tip = safetyTips[firstTipId];
    expect(screen.getByText(tip.title)).toBeInTheDocument();
    expect(screen.getByText('აღწერა')).toBeInTheDocument();
    expect(screen.getByText('უსაფრთხოების ჩექლისტი')).toBeInTheDocument();
  });

  it('clicking "შემდეგი თემა" advances to the next tip', () => {
    const ids = Object.keys(safetyTips);
    useSafetyStore.setState({ selectedPartId: ids[0], isPanelOpen: true });
    render(<SidePanel />);
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი თემა/ }));
    expect(useSafetyStore.getState().selectedPartId).toBe(ids[1]);
  });

  it('clicking "მონიშვნის გასუფთავება" clears the selection', () => {
    const firstId = Object.keys(safetyTips)[0];
    useSafetyStore.setState({ selectedPartId: firstId, isPanelOpen: true });
    render(<SidePanel />);
    fireEvent.click(screen.getByRole('button', { name: /მონიშვნის გასუფთავება/ }));
    expect(useSafetyStore.getState().selectedPartId).toBe(null);
  });

  it('clicking the close button closes the panel', () => {
    render(<SidePanel />);
    fireEvent.click(screen.getByLabelText('პანელის დახურვა'));
    expect(useSafetyStore.getState().isPanelOpen).toBe(false);
  });

  it('clicking an empty-state list item selects that part', () => {
    render(<SidePanel />);
    const firstTipTitle = Object.values(safetyTips)[0].title;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(firstTipTitle) }));
    expect(useSafetyStore.getState().selectedPartId).toBe(Object.keys(safetyTips)[0]);
  });
});
