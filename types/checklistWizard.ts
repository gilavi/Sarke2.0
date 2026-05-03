// Shared types for the reusable checklist wizard (Bobcat / Excavator / etc.)

export interface ChecklistCatalogItem {
  id: number;
  category: string;
  label: string;
  description: string;
  helpText?: string;
  unusableLabel?: string;
  unusableIsNeutral?: boolean;
}

export interface ChecklistItemState {
  id: number;
  result: 'good' | 'deficient' | 'unusable' | null;
  comment: string | null;
  photo_paths: string[];
}
