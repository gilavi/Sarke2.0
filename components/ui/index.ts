// components/ui — barrel for legacy + new primitives.
//
// Existing call sites `from '../components/ui'` are preserved by this barrel.
// New code should prefer importing from `../components/primitives` directly,
// or from the per-file modules here.

// New primitives (re-exported for backward compatibility)
export { Button, Card, Input, Badge, Screen, A11yText } from '../primitives';

// New shared components (re-exported for backward compatibility)
export { SectionHeader as SectionHeaderNew } from '../SectionHeader';
export { FormField } from '../FormField';
export { ButtonGroup } from '../ButtonGroup';
export { ActionSheet } from '../ActionSheet';
export { ActionSheetItem } from '../primitives/ActionSheetItem';

// Legacy helpers (now per-file)
export { Label } from './Label';
export { Field } from './Field';
export { Chip } from './Chip';
export { SectionHeader } from './SectionHeaderLegacy';
export { ErrorText } from './ErrorText';

// Existing internal pieces of the ui folder
export { CustomDropdown } from './CustomDropdown';
export type { DropdownOption } from './CustomDropdown';
