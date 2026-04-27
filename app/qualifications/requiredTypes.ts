export type RequiredType = { value: string; label: string };

export const REQUIRED_TYPES: RequiredType[] = [
  { value: 'xaracho_inspector', label: 'ხარაჩოს ინსპექტორი' },
  { value: 'harness_inspector', label: 'ქამრების ინსპექტორი' },
  { value: 'tbd_3', label: 'TBD 3' },
  { value: 'tbd_4', label: 'TBD 4' },
  { value: 'tbd_5', label: 'TBD 5' },
];

export const REQUIRED_TYPE_VALUES = new Set(REQUIRED_TYPES.map(t => t.value));

export function labelForType(value: string): string {
  return REQUIRED_TYPES.find(t => t.value === value)?.label ?? value;
}
