import { describe, it, expect } from 'vitest';
import { render } from '@/test-utils';
import SkeletonCard, {
  SkeletonList,
  SkeletonStatCard,
  SkeletonGrid,
  SkeletonDetailPage,
} from '@/components/SkeletonCard';

describe('Skeleton placeholders', () => {
  it('renders the single skeleton card', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders one card per item in SkeletonList', () => {
    const { container } = render(<SkeletonList count={3} />);
    expect(container.querySelector('.grid')?.children).toHaveLength(3);
  });

  it('renders the stat-card skeleton with a custom class', () => {
    const { container } = render(<SkeletonStatCard className="extra" />);
    expect(container.querySelector('.extra')).toBeInTheDocument();
  });

  it('renders the grid skeleton (2 and 3 column variants)', () => {
    expect(render(<SkeletonGrid count={4} cols={2} />).container.querySelector('.grid')?.children).toHaveLength(4);
    expect(render(<SkeletonGrid />).container.querySelector('.xl\\:grid-cols-3')).toBeInTheDocument();
  });

  it('renders the detail-page skeleton', () => {
    const { container } = render(<SkeletonDetailPage />);
    expect(container.firstChild).toBeTruthy();
  });
});
