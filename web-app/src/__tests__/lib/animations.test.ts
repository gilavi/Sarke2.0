import { describe, it, expect } from 'vitest';
import {
  EASE,
  DURATION,
  SPRING,
  STAGGER,
  staggerContainer,
  fadeUpItem,
  scrollReveal,
  hoverLift,
  hoverLiftDark,
} from '@/lib/animations';

describe('animation tokens', () => {
  it('exposes easing / duration / spring / stagger constants', () => {
    expect(EASE.easeOut).toHaveLength(4);
    expect(DURATION.fast).toBe(0.2);
    expect(SPRING.modal.stiffness).toBe(350);
    expect(STAGGER.list).toBe(0.04);
  });

  it('staggerContainer builds a variant with the given child stagger', () => {
    const v = staggerContainer(0.1) as { visible: { transition: { staggerChildren: number } } };
    expect(v.visible.transition.staggerChildren).toBe(0.1);
    expect((staggerContainer() as { visible: { transition: { staggerChildren: number } } }).visible.transition.staggerChildren).toBe(STAGGER.list);
  });

  it('fadeUpItem / scrollReveal expose hidden + visible states', () => {
    expect((fadeUpItem() as { hidden: unknown }).hidden).toEqual({ opacity: 0, y: 10 });
    expect((scrollReveal() as { visible: { y: number } }).visible.y).toBe(0);
  });

  it('hover lift presets translate up by 2px', () => {
    expect(hoverLift.y).toBe(-2);
    expect(hoverLiftDark.y).toBe(-2);
  });
});
