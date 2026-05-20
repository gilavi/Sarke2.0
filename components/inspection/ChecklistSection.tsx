import { View } from 'react-native';
import { SectionHeader } from '../SectionHeader';
import { ChecklistItem, type ChecklistItemOptions } from './ChecklistItem';

export interface ChecklistItemData {
  id: number;
  label: string;
  description?: string;
  type?: 'three_state' | 'binary';
  options: ChecklistItemOptions;
  value: string | null;
  comment?: string | null;
  photoPaths?: string[];
}

export interface ChecklistSectionProps {
  title: string;
  items: ChecklistItemData[];
  onItemChange: (id: number, field: 'value' | 'comment', val: string | null) => void;
  onAddPhoto: (id: number) => void;
  onDeletePhoto: (id: number, path: string) => void;
}

export function ChecklistSection({
  title,
  items,
  onItemChange,
  onAddPhoto,
  onDeletePhoto,
}: ChecklistSectionProps) {
  return (
    <View style={{ gap: 4 }}>
      <SectionHeader title={title} />
      {items.map(item => (
        <ChecklistItem
          key={item.id}
          id={item.id}
          label={item.label}
          description={item.description}
          type={item.type}
          options={item.options}
          value={item.value}
          onChange={val => onItemChange(item.id, 'value', val)}
          comment={item.comment ?? undefined}
          onCommentChange={text => onItemChange(item.id, 'comment', text || null)}
          photoPaths={item.photoPaths}
          onAddPhoto={() => onAddPhoto(item.id)}
          onDeletePhoto={path => onDeletePhoto(item.id, path)}
        />
      ))}
    </View>
  );
}
