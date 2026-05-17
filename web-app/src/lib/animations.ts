import type { Variants } from 'framer-motion';

export const EASE = {
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0.55, 0.45, 1] as const,
} as const;

export const DURATION = {
  micro: 0.15,
  fast: 0.2,
  normal: 0.25,
  slow: 0.4,
  ambient: 0.5,
} as const;

export const SPRING = {
  buttonTap: { stiffness: 500, damping: 28, mass: 0.8 },
  hoverLift: { stiffness: 350, damping: 25, mass: 0.6 },
  cardEntrance: { stiffness: 400, damping: 25, mass: 0.5 },
  modal: { stiffness: 350, damping: 25, mass: 0.7 },
  listItem: { stiffness: 400, damping: 28, mass: 0.5 },
  counter: { stiffness: 180, damping: 22, mass: 1.2 },
} as const;

export const STAGGER = {
  list: 0.04,
  grid: 0.05,
  stats: 0.08,
  sidebar: 0.03,
} as const;

export const staggerContainer = (delay: number = STAGGER.list): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: delay, delayChildren: 0.05 },
  },
});

export const fadeUpItem = (spring = SPRING.listItem): Variants => ({
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', ...spring },
  },
});

export const hoverLift = {
  y: -2,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  transition: { type: 'spring' as const, ...SPRING.hoverLift },
};

export const hoverLiftDark = {
  y: -2,
  boxShadow: '0 0 20px rgba(71,175,135,0.15)',
  transition: { type: 'spring' as const, ...SPRING.hoverLift },
};

export const scrollReveal = (spring = SPRING.cardEntrance): Variants => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', ...spring },
  },
});
