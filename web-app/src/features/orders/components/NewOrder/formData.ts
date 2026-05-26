import type {
  OrderDocumentType,
  FireSafetyOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  LaborSafetyOrderFormData,
  AlcoholControlOrderFormData,
} from '@/lib/data/orders';
import type { Form } from './types';

export type OrderFormDataUnion =
  | FireSafetyOrderFormData
  | FireSafetyOrderEnterpriseFormData
  | LaborSafetyOrderFormData
  | AlcoholControlOrderFormData;

export interface SaveVars {
  asDraft: boolean;
  pid: string;
  dt: OrderDocumentType;
  formData: OrderFormDataUnion;
  html: string;
  destProjectId: string;
}

export function buildFormDataFrom(docType: OrderDocumentType | null, form: Form): OrderFormDataUnion {
  const base = {
    orderNumber: form.orderNumber,
    city: form.city,
    orderDate: new Date(form.orderDate).toISOString(),
    companyName: form.companyName,
    identificationCode: form.identificationCode,
    legalAddress: form.legalAddress,
    directorName: form.directorName,
  };
  if (docType === 'fire_safety_order') {
    return {
      ...base,
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
      ...base,
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
  if (docType === 'alcohol_control') {
    return {
      ...base,
      facilityName: form.facilityName,
      responsiblePersonName: form.responsiblePersonName,
      responsiblePersonPosition: form.responsiblePersonPosition,
      responsiblePersonPersonalId: form.responsiblePersonPersonalId,
    };
  }
  return {
    ...base,
    facilityName: form.facilityName,
    specialistName: form.specialistName,
    specialistPersonalId: form.specialistPersonalId,
    certificateNumber: form.certificateNumber,
    certificateDate: new Date(form.certificateDate).toISOString(),
  };
}
