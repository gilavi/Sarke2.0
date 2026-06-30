// orderFormSchema.ts - types, initial state, helpers for the order wizard.

import { ShieldCheck, Ban, Flame, Wrench, Building2, GraduationCap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type {
  AlcoholControlOrderFormData,
  CraneOperatorOrderFormData,
  CraneTechnicalOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  FireSafetyOrderFormData,
  LaborSafetyOrderFormData,
  ScaffoldSupervisionOrderFormData,
  TrainingScheduleOrderFormData,
  OrderDocumentType,
} from '../../types/models';

export type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function getTotalSteps(docType: OrderDocumentType | null): number {
  // Crane: 1 type · 2 company · 3 operator · 4 certificate · 5 serial number ·
  //        6 crane specs. Signatures + PDF happen on the success screen
  //        (act-style FlowSuccessScreen), not in the wizard.
  if (docType === 'crane_operator_order' || docType === 'crane_technical_order') return 6;
  // Scaffold: 1 type · 2 company · 3 supervisor. Also act-style (no summary/sig).
  if (docType === 'scaffold_supervision_order') return 3;
  // Simple fire safety is act-style (3 steps); the enterprise variant stays
  // classic (5 steps: + summary + in-wizard signatures).
  if (docType === 'fire_safety_order') return 3;
  if (docType === 'fire_safety_order_enterprise') return 5;
  // Labor safety is act-style (type · company · person).
  if (docType === 'labor_safety_specialist') return 3;
  // Training schedule is mostly static — type · company only.
  if (docType === 'training_schedule_order') return 2;
  return 4; // alcohol_control (classic: + summary)
}

export function isFireSafetyVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise';
}

export function isCraneVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'crane_operator_order' || docType === 'crane_technical_order';
}

/** Order types that finish like an act: no in-wizard summary/signature step;
 *  signature graphs + on-demand PDF live on the success screen. */
export function isActStyleOrder(docType: OrderDocumentType | null): boolean {
  return (
    isCraneVariant(docType) ||
    docType === 'scaffold_supervision_order' ||
    docType === 'fire_safety_order' ||
    docType === 'labor_safety_specialist' ||
    docType === 'training_schedule_order'
  );
}

/** @deprecated Use isCraneVariant */
export const isCraneOperatorVariant = isCraneVariant;

// Combined form - all fields across all document types; unused ones stay ''
export interface CombinedForm {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  facilityName: string;
  // labor_safety_specialist
  specialistName: string;
  specialistPersonalId: string;
  certificateNumber: string;
  certificateDate: string;
  activityField: string; // საქმიანობის სფერო (doc #6)
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
  // crane_operator_order / crane_technical_order
  craneOperatorName: string;
  craneOperatorPersonalId: string;
  craneOperatorPosition: string;       // crane_operator_order
  craneOperatorQualification: string;  // crane_technical_order
  craneOperatorCertNumber: string;
  craneOperatorCertExpiry: string;
  craneOperatorPhone: string;
  craneOperatorCertPhoto: string | null;
  craneModel: string;
  craneNumber: string;
  craneMaxLoad: string;
  craneInspCertPhoto: string | null;
  operatorSignature: string | null;
  operatorSignedAt: string | null;
  // Number of extra blank hand-sign slots for the crane signature step.
  signatureExtraRows: number;
}

export const INITIAL_FORM: CombinedForm = {
  orderNumber: '',
  city: '',
  orderDate: new Date().toISOString(),
  companyName: '',
  identificationCode: '',
  legalAddress: '',
  directorName: '',
  facilityName: '',
  specialistName: '',
  specialistPersonalId: '',
  certificateNumber: '',
  certificateDate: new Date().toISOString(),
  activityField: '',
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
  craneOperatorName: '',
  craneOperatorPersonalId: '',
  craneOperatorPosition: '',
  craneOperatorQualification: '',
  craneOperatorCertNumber: '',
  craneOperatorCertExpiry: new Date().toISOString(),
  craneOperatorPhone: '',
  craneOperatorCertPhoto: null,
  craneModel: '',
  craneNumber: '',
  craneMaxLoad: '',
  craneInspCertPhoto: null,
  operatorSignature: null,
  operatorSignedAt: null,
  signatureExtraRows: 0,
};

export const DOC_TYPES: { type: OrderDocumentType; Icon: LucideIcon }[] = [
  { type: 'labor_safety_specialist',      Icon: ShieldCheck },
  { type: 'alcohol_control',              Icon: Ban },
  { type: 'fire_safety_order',            Icon: Flame },
  { type: 'fire_safety_order_enterprise', Icon: Flame },
  { type: 'crane_operator_order',         Icon: Wrench },
  { type: 'crane_technical_order',        Icon: Wrench },
  { type: 'scaffold_supervision_order',   Icon: Building2 },
  { type: 'training_schedule_order',      Icon: GraduationCap },
];

export type AnyOrderFormData =
  | LaborSafetyOrderFormData
  | AlcoholControlOrderFormData
  | FireSafetyOrderFormData
  | FireSafetyOrderEnterpriseFormData
  | CraneOperatorOrderFormData
  | CraneTechnicalOrderFormData
  | ScaffoldSupervisionOrderFormData
  | TrainingScheduleOrderFormData;

export function buildFormData(
  form: CombinedForm,
  docType: OrderDocumentType | null,
): AnyOrderFormData {
  const base = {
    orderNumber: form.orderNumber,
    city: form.city,
    orderDate: form.orderDate,
    companyName: form.companyName,
    identificationCode: form.identificationCode,
    legalAddress: form.legalAddress,
    directorName: form.directorName,
    facilityName: form.facilityName,
  };
  if (docType === 'alcohol_control') {
    return {
      ...base,
      responsiblePersonName: form.responsiblePersonName,
      responsiblePersonPosition: form.responsiblePersonPosition,
      responsiblePersonPersonalId: form.responsiblePersonPersonalId,
    };
  }
  if (docType === 'fire_safety_order') {
    return {
      orderNumber: form.orderNumber,
      city: form.city,
      orderDate: form.orderDate,
      companyName: form.companyName,
      identificationCode: form.identificationCode,
      legalAddress: form.legalAddress,
      directorName: form.directorName,
      appointedName: form.appointedName,
      appointedPhone: form.appointedPhone,
      objectName: form.objectName,
      objectAddress: form.objectAddress,
      directorSignature: form.directorSignature,
      directorSignedAt: form.directorSignedAt,
      appointedSignature: form.appointedSignature,
      appointedSignedAt: form.appointedSignedAt,
      signatureExtraRows: form.signatureExtraRows,
    };
  }
  if (docType === 'fire_safety_order_enterprise') {
    return {
      orderNumber: form.orderNumber,
      city: form.city,
      orderDate: form.orderDate,
      companyName: form.companyName,
      identificationCode: form.identificationCode,
      legalAddress: form.legalAddress,
      directorName: form.directorName,
      appointedName: form.appointedName,
      appointedPhone: form.appointedPhone,
      appointedPosition: form.appointedPosition,
      appointedIdNumber: form.appointedIdNumber,
      objectName: form.objectName,
      objectAddress: form.objectAddress,
      directorSignature: form.directorSignature,
      directorSignedAt: form.directorSignedAt,
      appointedSignature: form.appointedSignature,
      appointedSignedAt: form.appointedSignedAt,
    };
  }
  if (docType === 'crane_operator_order') {
    return {
      orderNumber: form.orderNumber,
      orderDate: form.orderDate,
      companyName: form.companyName,
      objectAddress: form.objectAddress,
      directorName: form.directorName,
      craneOperatorName: form.craneOperatorName,
      craneOperatorPersonalId: form.craneOperatorPersonalId,
      craneOperatorPosition: form.craneOperatorPosition,
      craneOperatorCertNumber: form.craneOperatorCertNumber,
      craneOperatorCertExpiry: form.craneOperatorCertExpiry,
      craneOperatorPhone: form.craneOperatorPhone,
      craneOperatorCertPhoto: form.craneOperatorCertPhoto,
      craneModel: form.craneModel,
      craneNumber: form.craneNumber,
      craneMaxLoad: form.craneMaxLoad,
      craneInspCertPhoto: form.craneInspCertPhoto,
      directorSignature: form.directorSignature,
      directorSignedAt: form.directorSignedAt,
      operatorSignature: form.operatorSignature,
      operatorSignedAt: form.operatorSignedAt,
      signatureExtraRows: form.signatureExtraRows,
    };
  }
  if (docType === 'crane_technical_order') {
    return {
      orderNumber: form.orderNumber,
      orderDate: form.orderDate,
      companyName: form.companyName,
      objectAddress: form.objectAddress,
      directorName: form.directorName,
      craneOperatorName: form.craneOperatorName,
      craneOperatorPersonalId: form.craneOperatorPersonalId,
      craneOperatorQualification: form.craneOperatorQualification,
      craneOperatorCertNumber: form.craneOperatorCertNumber,
      craneOperatorCertExpiry: form.craneOperatorCertExpiry,
      craneOperatorPhone: form.craneOperatorPhone,
      craneOperatorCertPhoto: form.craneOperatorCertPhoto,
      craneModel: form.craneModel,
      craneNumber: form.craneNumber,
      craneMaxLoad: form.craneMaxLoad,
      craneInspCertPhoto: form.craneInspCertPhoto,
      directorSignature: form.directorSignature,
      directorSignedAt: form.directorSignedAt,
      operatorSignature: form.operatorSignature,
      operatorSignedAt: form.operatorSignedAt,
      signatureExtraRows: form.signatureExtraRows,
    };
  }
  if (docType === 'scaffold_supervision_order') {
    return {
      orderNumber: form.orderNumber,
      city: form.city,
      orderDate: form.orderDate,
      companyName: form.companyName,
      objectAddress: form.objectAddress,
      directorName: form.directorName,
      appointedName: form.appointedName,
      appointedPosition: form.appointedPosition,
      appointedPhone: form.appointedPhone,
      directorSignature: form.directorSignature,
      directorSignedAt: form.directorSignedAt,
      appointedSignature: form.appointedSignature,
      appointedSignedAt: form.appointedSignedAt,
      signatureExtraRows: form.signatureExtraRows,
    };
  }
  if (docType === 'training_schedule_order') {
    return {
      orderDate: form.orderDate,
      companyName: form.companyName,
      directorName: form.directorName,
      directorSignature: form.directorSignature,
      directorSignedAt: form.directorSignedAt,
      signatureExtraRows: form.signatureExtraRows,
    };
  }
  // labor_safety_specialist
  return {
    ...base,
    specialistName: form.specialistName,
    specialistPersonalId: form.specialistPersonalId,
    certificateNumber: form.certificateNumber,
    certificateDate: form.certificateDate,
    objectAddress: form.objectAddress,
    activityField: form.activityField,
    directorSignature: form.directorSignature,
    directorSignedAt: form.directorSignedAt,
    signatureExtraRows: form.signatureExtraRows,
  };
}

export function docSlug(docType: OrderDocumentType | null): string {
  if (docType === 'alcohol_control') return 'brdzaneba_alkoholi';
  if (docType === 'fire_safety_order') return 'brdzaneba_saxandzro';
  if (docType === 'fire_safety_order_enterprise') return 'brdzaneba_saxandzro_sawarmoo';
  if (docType === 'crane_operator_order') return 'brdzaneba_amwis_operatori';
  if (docType === 'crane_technical_order') return 'brdzaneba_amwis_teqnikuri';
  if (docType === 'scaffold_supervision_order') return 'brdzaneba_xaracho';
  if (docType === 'training_schedule_order') return 'swavleba_grafiki';
  return 'brdzaneba_shus_danishvna';
}

/**
 * Ordered (top-to-bottom, matching on-screen field order) list of the REQUIRED
 * field keys that are currently empty/invalid for `step` + `docType`. Returns
 * `[]` for steps with no required fields. Mirrors `canAdvanceStep` exactly — the
 * two share this single source of truth so the red-field, enable, and
 * scroll-to-error wiring can never drift apart. Keys match the
 * `registerField('<key>')` wrappers in the corresponding Step components.
 *
 * Side effects: none (pure).
 */
export function missingFieldsForStep(
  step: Step,
  docType: OrderDocumentType | null,
  form: CombinedForm,
): string[] {
  const missing: string[] = [];
  const reqText = (key: keyof CombinedForm) => {
    if (!String(form[key] ?? '').trim()) missing.push(key as string);
  };
  const reqPersonalId = (key: keyof CombinedForm) => {
    if (String(form[key] ?? '').trim().length !== 11) missing.push(key as string);
  };
  const reqSig = (key: keyof CombinedForm) => {
    if (!form[key]) missing.push(key as string);
  };

  if (step === 1) return missing; // doc-type select handled by Step1/summary, no scroll target
  if (step === 2) {
    if (isCraneOperatorVariant(docType)) {
      reqText('orderNumber');
      reqText('companyName');
      reqText('directorName');
      return missing;
    }
    if (docType === 'training_schedule_order') {
      // Training schedule is mostly static — only company + director matter.
      reqText('companyName');
      reqText('directorName');
      return missing;
    }
    reqText('orderNumber');
    reqText('city');
    reqText('companyName');
    reqText('directorName');
    return missing;
  }
  if (step === 3) {
    if (docType === 'labor_safety_specialist') {
      reqText('specialistName');
      reqText('objectAddress');
      reqText('activityField');
      return missing;
    }
    if (docType === 'alcohol_control') {
      reqText('facilityName');
      reqText('responsiblePersonName');
      reqText('responsiblePersonPosition');
      reqPersonalId('responsiblePersonPersonalId');
      return missing;
    }
    if (docType === 'fire_safety_order') {
      reqText('appointedName');
      reqText('appointedPhone');
      reqText('objectName');
      return missing;
    }
    if (docType === 'fire_safety_order_enterprise') {
      // On-screen order: name, position, id number, phone, object name.
      reqText('appointedName');
      reqText('appointedPosition');
      reqText('appointedIdNumber');
      reqText('appointedPhone');
      reqText('objectName');
      return missing;
    }
    if (docType === 'crane_operator_order' || docType === 'crane_technical_order') {
      reqText('craneOperatorName');
      reqPersonalId('craneOperatorPersonalId');
      return missing;
    }
    if (docType === 'scaffold_supervision_order') {
      reqText('appointedName');
      return missing;
    }
    return missing;
  }
  // step 4 crane: certificate step — certificate number is required.
  if (step === 4 && isCraneVariant(docType)) {
    reqText('craneOperatorCertNumber');
    return missing;
  }
  // step 5 crane: serial number · step 6 crane: crane specs — no required
  // fields. (Crane has no summary/signature steps; signatures are added on
  // the success screen.)
  // Only the classic enterprise fire-safety variant keeps an in-wizard
  // signature step; simple fire safety is act-style (signed on the success
  // screen).
  if (step === 5 && docType === 'fire_safety_order_enterprise') {
    reqSig('directorSignature');
    reqSig('appointedSignature');
    return missing;
  }
  return missing;
}

// Validation predicate for the "next" button. Shares its required-field logic
// with `missingFieldsForStep` so the two never drift.
export function canAdvanceStep(
  step: Step,
  docType: OrderDocumentType | null,
  form: CombinedForm,
): boolean {
  return missingFieldsForStep(step, docType, form).length === 0;
}
