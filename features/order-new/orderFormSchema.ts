// orderFormSchema.ts — types, initial state, helpers for the order wizard.

import { Ionicons } from '@expo/vector-icons';
import type {
  AlcoholControlOrderFormData,
  CraneOperatorOrderFormData,
  CraneTechnicalOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  FireSafetyOrderFormData,
  LaborSafetyOrderFormData,
  OrderDocumentType,
} from '../../types/models';

export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function getTotalSteps(docType: OrderDocumentType | null): number {
  if (docType === 'crane_operator_order' || docType === 'crane_technical_order') return 6;
  if (docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise') return 5;
  return 4;
}

export function isFireSafetyVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise';
}

export function isCraneVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'crane_operator_order' || docType === 'crane_technical_order';
}

/** @deprecated Use isCraneVariant */
export const isCraneOperatorVariant = isCraneVariant;

// Combined form — all fields across all document types; unused ones stay ''
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
};

export const DOC_TYPES: { type: OrderDocumentType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'labor_safety_specialist',      icon: 'shield-checkmark-outline' },
  { type: 'alcohol_control',              icon: 'ban-outline' },
  { type: 'fire_safety_order',            icon: 'flame-outline' },
  { type: 'fire_safety_order_enterprise', icon: 'flame-outline' },
  { type: 'crane_operator_order',         icon: 'construct-outline' },
  { type: 'crane_technical_order',        icon: 'construct-outline' },
];

export type AnyOrderFormData =
  | LaborSafetyOrderFormData
  | AlcoholControlOrderFormData
  | FireSafetyOrderFormData
  | FireSafetyOrderEnterpriseFormData
  | CraneOperatorOrderFormData
  | CraneTechnicalOrderFormData;

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
    };
  }
  return {
    ...base,
    specialistName: form.specialistName,
    specialistPersonalId: form.specialistPersonalId,
    certificateNumber: form.certificateNumber,
    certificateDate: form.certificateDate,
  };
}

export function docSlug(docType: OrderDocumentType | null): string {
  if (docType === 'alcohol_control') return 'brdzaneba_alkoholi';
  if (docType === 'fire_safety_order') return 'brdzaneba_saxandzro';
  if (docType === 'fire_safety_order_enterprise') return 'brdzaneba_saxandzro_sawarmoo';
  if (docType === 'crane_operator_order') return 'brdzaneba_amwis_operatori';
  if (docType === 'crane_technical_order') return 'brdzaneba_amwis_teqnikuri';
  return 'brdzaneba_shus_danishvna';
}

// Validation predicate for the "next" button.
export function canAdvanceStep(
  step: Step,
  docType: OrderDocumentType | null,
  form: CombinedForm,
): boolean {
  if (step === 1) return docType !== null;
  if (step === 2) {
    if (isCraneOperatorVariant(docType)) {
      return (
        form.orderNumber.trim().length > 0 &&
        form.companyName.trim().length > 0 &&
        form.directorName.trim().length > 0
      );
    }
    return (
      form.orderNumber.trim().length > 0 &&
      form.city.trim().length > 0 &&
      form.companyName.trim().length > 0 &&
      form.directorName.trim().length > 0
    );
  }
  if (step === 3) {
    if (docType === 'labor_safety_specialist') {
      return (
        form.facilityName.trim().length > 0 &&
        form.specialistName.trim().length > 0 &&
        form.specialistPersonalId.trim().length === 11 &&
        form.certificateNumber.trim().length > 0
      );
    }
    if (docType === 'alcohol_control') {
      return (
        form.facilityName.trim().length > 0 &&
        form.responsiblePersonName.trim().length > 0 &&
        form.responsiblePersonPosition.trim().length > 0 &&
        form.responsiblePersonPersonalId.trim().length === 11
      );
    }
    if (docType === 'fire_safety_order') {
      return (
        form.appointedName.trim().length > 0 &&
        form.appointedPhone.trim().length > 0 &&
        form.objectName.trim().length > 0
      );
    }
    if (docType === 'fire_safety_order_enterprise') {
      return (
        form.appointedName.trim().length > 0 &&
        form.appointedPhone.trim().length > 0 &&
        form.appointedPosition.trim().length > 0 &&
        form.appointedIdNumber.trim().length > 0 &&
        form.objectName.trim().length > 0
      );
    }
    if (docType === 'crane_operator_order' || docType === 'crane_technical_order') {
      return (
        form.craneOperatorName.trim().length > 0 &&
        form.craneOperatorPersonalId.trim().length === 11 &&
        form.craneOperatorCertNumber.trim().length > 0
      );
    }
  }
  // step 4 crane: crane specs — no required fields, always can advance
  // step 5 fire safety / step 6 crane: signature step — check signatures
  if (step === 5 && isFireSafetyVariant(docType)) {
    return !!form.directorSignature && !!form.appointedSignature;
  }
  if (step === 6 && isCraneOperatorVariant(docType)) {
    return !!form.directorSignature && !!form.operatorSignature;
  }
  return true;
}
