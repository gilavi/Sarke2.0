import { CircleCheck, AlertTriangle, CircleX, type LucideIcon } from 'lucide-react-native';
import type { BLResultStatus } from '../../types/breathalyzerLog';

/**
 * Monochrome result descriptor for the breathalyzer flow. Severity is carried by
 * icon + label only — no semantic colors — matching the inspection answer-control
 * rule. Consumers paint the icon with an ink token from the theme. Lives in the
 * component layer so `types/breathalyzerLog.ts` stays free of UI concerns.
 */
export const resultStatusIcon: Record<BLResultStatus, LucideIcon> = {
  safe: CircleCheck,
  warning: AlertTriangle,
  fail: CircleX,
};

/** Long, descriptive i18n key (used on the result step). */
export const resultStatusLabelKey: Record<BLResultStatus, string> = {
  safe: 'breathalyzer.statusSafe',
  warning: 'breathalyzer.statusWarning',
  fail: 'breathalyzer.statusFail',
};

/** Short i18n key (used on list-row badges + the close-shift summary). */
export const resultStatusShortKey: Record<BLResultStatus, string> = {
  safe: 'breathalyzer.statusSafeShort',
  warning: 'breathalyzer.statusWarningShort',
  fail: 'breathalyzer.statusFailShort',
};
