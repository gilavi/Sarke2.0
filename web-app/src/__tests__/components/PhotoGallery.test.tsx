/**
 * PhotoGallery — grid render + lightbox open/close + nav.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

import PhotoGallery from '@/components/PhotoGallery';

describe('PhotoGallery', () => {
  it('renders one button per non-empty URL and placeholder for empty ones', () => {
    const { container } = render(<PhotoGallery urls={['/a.png', '', '/c.png']} captions={['A', 'B', 'C']} />);
    expect(container.querySelectorAll('button').length).toBe(2);
    expect(container.querySelectorAll('img').length).toBe(2);
    // One placeholder div.
    expect(container.querySelectorAll('.bg-neutral-100').length).toBeGreaterThan(0);
  });

  it('clicking a tile opens the lightbox + shows the caption', async () => {
    render(<PhotoGallery urls={['/a.png', '/b.png']} captions={['A-cap', 'B-cap']} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    // Modal renders caption "A-cap" (Mantine Modal opens via portal).
    expect(await screen.findByText('A-cap')).toBeInTheDocument();
  });

  it('keyboard ArrowRight advances + ArrowLeft goes back', async () => {
    render(<PhotoGallery urls={['/a.png', '/b.png', '/c.png']} captions={['A', 'B', 'C']} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(await screen.findByText('A')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText('B')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('shows next/prev ActionIcons when not at first/last', async () => {
    render(<PhotoGallery urls={['/a.png', '/b.png', '/c.png']} />);
    fireEvent.click(screen.getAllByRole('button')[1]); // open middle
    // Now both prev + next ActionIcons render.
    expect(await screen.findByLabelText('წინა')).toBeInTheDocument();
    expect(screen.getByLabelText('შემდეგი')).toBeInTheDocument();
    // Click next.
    fireEvent.click(screen.getByLabelText('შემდეგი'));
    // Click prev (now at index 2, but we have 3 photos so next is gone, prev remains).
    expect(screen.getByLabelText('წინა')).toBeInTheDocument();
  });
});
