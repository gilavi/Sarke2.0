import { ORDER_DOCUMENT_TYPE_LABEL, type OrderDocumentType } from '@/lib/data/orders';

// ── Form interface ──────────────────────────────────────────────────────────────

export interface Form {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  // labor_safety
  facilityName: string;
  specialistName: string;
  specialistPersonalId: string;
  certificateNumber: string;
  certificateDate: string;
  // alcohol_control
  responsiblePersonName: string;
  responsiblePersonPosition: string;
  responsiblePersonPersonalId: string;
  // fire_safety_order
  appointedName: string;
  appointedPhone: string;
  objectName: string;
  objectAddress: string;
  // fire_safety_order_enterprise extras
  appointedPosition: string;
  appointedIdNumber: string;
  directorSignature: string | null;
  directorSignedAt: string | null;
  appointedSignature: string | null;
  appointedSignedAt: string | null;
}

const today = new Date().toISOString().split('T')[0];

export const INITIAL_FORM: Form = {
  orderNumber: '',
  city: '',
  orderDate: today,
  companyName: '',
  identificationCode: '',
  legalAddress: '',
  directorName: '',
  facilityName: '',
  specialistName: '',
  specialistPersonalId: '',
  certificateNumber: '',
  certificateDate: today,
  responsiblePersonName: '',
  responsiblePersonPosition: '',
  responsiblePersonPersonalId: '',
  appointedName: '',
  appointedPhone: '',
  objectName: '',
  objectAddress: '',
  appointedPosition: '',
  appointedIdNumber: '',
  directorSignature: null,
  directorSignedAt: null,
  appointedSignature: null,
  appointedSignedAt: null,
};

export function isFireSafetyVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise';
}

export function getStepLabels(docType: OrderDocumentType | null): string[] {
  const base = ['ტიპი', 'კომპანია', 'სპეციფიკა'];
  if (isFireSafetyVariant(docType)) return [...base, 'დირექტ. ხელმ.', 'პასუხ. ხელმ.', 'შეჯამება'];
  return [...base, 'შეჯამება'];
}

export const DOC_TYPE_OPTIONS: { type: OrderDocumentType; iconName: 'Shield' | 'Ban' | 'Flame'; label: string }[] = [
  { type: 'labor_safety_specialist',      iconName: 'Shield', label: ORDER_DOCUMENT_TYPE_LABEL.labor_safety_specialist },
  { type: 'alcohol_control',              iconName: 'Ban',    label: ORDER_DOCUMENT_TYPE_LABEL.alcohol_control },
  { type: 'fire_safety_order',            iconName: 'Flame',  label: ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order },
  { type: 'fire_safety_order_enterprise', iconName: 'Flame',  label: ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order_enterprise },
];
