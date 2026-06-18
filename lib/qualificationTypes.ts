export type RequiredType = { value: string; label: string };

export const REQUIRED_TYPES: RequiredType[] = [
  { value: 'xaracho_specialist', label: 'ხარაჩოს სპეციალისტის სერტიფიკატი' },
  { value: 'labor_safety_specialist', label: 'შრომის უსაფრთხოების სპეციალისტის სერტიფიკატი' },
  { value: 'electrician', label: 'ელექტრიკის სერტიფიკატი' },
  { value: 'rigger', label: 'მეჯამბარის სერტიფიკატი' },
];

export const REQUIRED_TYPE_VALUES = new Set(REQUIRED_TYPES.map(t => t.value));

export function labelForType(value: string): string {
  return REQUIRED_TYPES.find(t => t.value === value)?.label ?? value;
}
